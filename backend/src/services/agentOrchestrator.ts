/**
 * SyberOps — Real Claude AI Agent Orchestrator
 *
 * Runs 8 specialised Claude agents in sequence to triage a security alert.
 * Falls back gracefully to the simulation engine when no API key is set.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Alert, AgentStep, Verdict } from '../types';
import { AITriageEngine } from './aiTriageEngine';

/* ── Agent definitions ──────────────────────────────────────────── */
const AGENT_CONFIGS = [
  {
    name: 'AlertIntakeAgent',
    label: 'Alert Intake',
    role: 'You are AlertIntakeAgent, a security alert classification specialist. Your job is to parse, normalise, and classify incoming security alerts. Assess the event type, severity, affected assets, and initial threat category.',
  },
  {
    name: 'EnrichmentAgent',
    label: 'Enrichment',
    role: 'You are EnrichmentAgent, a cybersecurity enrichment specialist. Enrich the alert with context about assets, IOCs, historical baselines, and anomaly scores. Infer additional context from the alert details provided.',
  },
  {
    name: 'ThreatIntelAgent',
    label: 'Threat Intelligence',
    role: 'You are ThreatIntelAgent, a threat intelligence analyst. Assess IOCs against known threat actor TTPs, APT groups, malware families, and global threat feeds. Reference MITRE ATT&CK where applicable.',
  },
  {
    name: 'CorrelationAgent',
    label: 'Correlation',
    role: 'You are CorrelationAgent, a security correlation specialist. Identify patterns, related attacks, campaign attribution, and attack chain reconstruction based on the alert and previous findings.',
  },
  {
    name: 'InvestigationAgent',
    label: 'Investigation',
    role: 'You are InvestigationAgent, a senior SOC investigator. Conduct a deep behavioural analysis: execution context, lateral movement indicators, privilege escalation attempts, and persistence mechanisms.',
  },
  {
    name: 'VerdictAgent',
    label: 'Verdict',
    role: 'You are VerdictAgent, responsible for final triage decisions. Based on all previous findings, determine verdict (true_positive | false_positive | suspicious | benign) and confidence (0–100). Be precise and evidence-based.',
  },
  {
    name: 'ResponseAgent',
    label: 'Response Planning',
    role: 'You are ResponseAgent, a security response specialist. Generate prioritised, actionable response playbook steps. Include containment, eradication, and recovery actions specific to this alert.',
  },
  {
    name: 'ComplianceAgent',
    label: 'Compliance',
    role: 'You are ComplianceAgent, a regulatory and compliance specialist. Assess GDPR, HIPAA, PCI-DSS, SOC 2, and NIST implications. Determine notification obligations and regulatory timeline requirements.',
  },
] as const;

/* ── Result from each agent ─────────────────────────────────────── */
interface AgentResult {
  finding: string;
  detail: string;
  verdict?: Verdict;
  confidence?: number;
}

/* ── Orchestrator ───────────────────────────────────────────────── */
export class AgentOrchestrator {
  private client: Anthropic | null = null;
  private fallback = new AITriageEngine();
  private model: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.client = new Anthropic({ apiKey: key });
      console.log('[AI] Real Claude AI agents enabled');
    } else {
      console.log('[AI] No ANTHROPIC_API_KEY — using simulation engine');
    }
    this.model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  }

  get hasRealAI(): boolean {
    return this.client !== null;
  }

  /** Main entry point — returns the fully triaged alert */
  async triageAlert(
    alert: Alert,
    onProgress: (step: AgentStep, index: number) => void,
  ): Promise<Alert> {
    // No API key → delegate to simulation engine
    if (!this.client) {
      return this.fallback.triageAlert(alert, onProgress);
    }

    const findings: string[] = [];
    alert.agentSteps = [];

    for (let i = 0; i < AGENT_CONFIGS.length; i++) {
      const cfg = AGENT_CONFIGS[i];
      const startedAt = new Date().toISOString();

      // Emit "running" state
      const step: AgentStep = {
        agentName: cfg.name,
        agentLabel: cfg.label,
        status: 'running',
        startedAt,
        finding: '⏳ Processing…',
        detail: '',
      };
      alert.agentSteps.push(step);
      onProgress({ ...step }, i);

      try {
        const t0 = Date.now();
        const result = await this.runAgent(cfg, alert, findings);

        step.status = 'complete';
        step.finding = result.finding;
        step.detail = result.detail ?? '';
        step.completedAt = new Date().toISOString();
        step.durationMs = Date.now() - t0;

        findings.push(result.finding);

        // VerdictAgent sets alert outcome
        if (cfg.name === 'VerdictAgent' && result.verdict) {
          alert.verdict = result.verdict;
          alert.confidence = result.confidence ?? 70;
        }
      } catch (err) {
        console.error(`[AI] ${cfg.name} failed:`, err);
        step.status = 'error';
        step.finding = `Agent encountered an error. Continuing pipeline.`;
        step.completedAt = new Date().toISOString();
      }

      onProgress({ ...step }, i);
    }

    // Ensure verdict is set even if VerdictAgent failed
    if (!alert.verdict || alert.verdict === 'pending') {
      alert.verdict = this.inferVerdict(alert);
      alert.confidence = 70;
    }

    alert.status = 'triaged';
    alert.triageCompletedAt = new Date().toISOString();

    return alert;
  }

  /** Call one Claude agent and parse its response */
  private async runAgent(
    cfg: (typeof AGENT_CONFIGS)[number],
    alert: Alert,
    previousFindings: string[],
  ): Promise<AgentResult> {
    const client = this.client!;

    const alertSummary = JSON.stringify(
      {
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        source: alert.source,
        description: alert.description,
        affectedAssets: alert.affectedAssets,
        iocs: alert.iocs,
        mitreTechniques: alert.mitreTechniques,
        timestamp: alert.timestamp,
      },
      null,
      2,
    );

    const previousContext =
      previousFindings.length > 0
        ? `\n\nPrevious agent findings:\n${previousFindings.map((f, i) => `[Agent ${i + 1}]: ${f}`).join('\n')}`
        : '';

    const isVerdictAgent = cfg.name === 'VerdictAgent';

    const prompt = `You are operating as part of the SyberOps AI triage pipeline.

ALERT DATA:
${alertSummary}
${previousContext}

${isVerdictAgent ? 'Based on ALL findings above, determine the final verdict.' : 'Analyse the alert from your specialist perspective.'}

Respond with ONLY valid JSON in this exact format:
${
  isVerdictAgent
    ? `{
  "finding": "<one paragraph verdict summary with evidence>",
  "detail": "<supporting technical detail>",
  "verdict": "<true_positive | false_positive | suspicious | benign>",
  "confidence": <number 0-100>
}`
    : `{
  "finding": "<one paragraph key finding from your analysis>",
  "detail": "<supporting technical detail, tools, data sources used>"
}`
}`;

    const message = await client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: cfg.role,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return this.parseAgentResponse(text, isVerdictAgent);
  }

  /** Extract JSON from Claude's response */
  private parseAgentResponse(text: string, isVerdictAgent: boolean): AgentResult {
    // Try to find JSON block in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        finding: text.trim().substring(0, 300) || 'Analysis complete.',
        detail: '',
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        finding?: string;
        detail?: string;
        verdict?: string;
        confidence?: number;
      };

      const result: AgentResult = {
        finding: parsed.finding || 'Analysis complete.',
        detail: parsed.detail || '',
      };

      if (isVerdictAgent) {
        result.verdict = this.normaliseVerdict(parsed.verdict);
        result.confidence = typeof parsed.confidence === 'number'
          ? Math.min(100, Math.max(0, parsed.confidence))
          : 70;
      }

      return result;
    } catch {
      return {
        finding: text.substring(0, 300) || 'Analysis complete.',
        detail: '',
      };
    }
  }

  private normaliseVerdict(raw?: string): Verdict {
    if (!raw) return 'suspicious';
    const v = raw.toLowerCase().replace(/[^a-z_]/g, '');
    const valid: Verdict[] = ['true_positive', 'false_positive', 'suspicious', 'benign', 'pending'];
    return valid.includes(v as Verdict) ? (v as Verdict) : 'suspicious';
  }

  /** Simple heuristic fallback if VerdictAgent failed */
  private inferVerdict(alert: Alert): Verdict {
    const t = alert.title.toLowerCase();
    if (t.includes('mimikatz') || t.includes('ransomware') || t.includes('c2')) return 'true_positive';
    if (t.includes('brute') || t.includes('lateral') || t.includes('cryptomining')) return 'true_positive';
    if (t.includes('impossible travel') || t.includes('privileged')) return 'suspicious';
    return 'suspicious';
  }
}
