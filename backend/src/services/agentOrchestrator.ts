/**
 * SyberOps — Agentic Claude Orchestrator
 *
 * Each of the 8 agents runs an agentic loop:
 *   1. Send alert context + previous findings to Claude
 *   2. Claude decides which tools to call (lookup_ip_reputation, search_mitre_attack, etc.)
 *   3. Tools execute and results are fed back to Claude
 *   4. Loop continues until Claude produces a final text analysis
 *
 * This means agents genuinely look up IOCs, check MITRE ATT&CK, and
 * query asset risk profiles — not just generate plausible-sounding text.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ToolUseBlock,
  TextBlock,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';

import { Alert, AgentStep, ToolCall, Verdict } from '../types';
import { AITriageEngine } from './aiTriageEngine';
import { SOC_TOOLS, AGENT_TOOLS, executeTool } from './tools';

/* ── Agent definitions ──────────────────────────────────────────── */

const AGENT_CONFIGS = [
  {
    name: 'AlertIntakeAgent',
    label: 'Alert Intake',
    role: `You are AlertIntakeAgent, a senior SOC analyst specializing in alert intake and initial classification.
Parse and normalise the incoming alert. Identify the event type, threat category, and initial severity assessment.
Use the lookup_ip_reputation tool on any IPs in the alert, and search_mitre_attack to validate the MITRE technique.
After gathering tool data, produce a concise classification summary.`,
  },
  {
    name: 'EnrichmentAgent',
    label: 'Context Enrichment',
    role: `You are EnrichmentAgent, a threat enrichment specialist.
Your job is to enrich the alert with contextual intelligence.
Use get_asset_risk_profile on affected assets, lookup_ip_reputation on external IPs, and lookup_domain_reputation on any domains.
Summarise the enriched context — risk levels, asset exposure, and relevant threat landscape.`,
  },
  {
    name: 'ThreatIntelAgent',
    label: 'Threat Intelligence',
    role: `You are ThreatIntelAgent, a threat intelligence analyst.
Correlate observable indicators (IPs, hashes, domains) against threat intelligence databases.
Use lookup_file_hash for any file hashes, lookup_ip_reputation and lookup_domain_reputation for network IOCs, and search_mitre_attack for technique attribution.
Attribute to known threat actors or malware families where possible.`,
  },
  {
    name: 'CorrelationAgent',
    label: 'Alert Correlation',
    role: `You are CorrelationAgent, a security correlation specialist.
Identify attack patterns, campaign attribution, and attack chain reconstruction.
Use get_asset_risk_profile to check if affected assets have been involved in prior incidents.
Assess whether this alert is part of a broader campaign or isolated incident.`,
  },
  {
    name: 'InvestigationAgent',
    label: 'Deep Investigation',
    role: `You are InvestigationAgent, a senior SOC investigator.
Conduct a deep behavioural analysis of this alert. Look for lateral movement, privilege escalation, persistence mechanisms, and C2 activity.
Use lookup_ip_reputation on C2-related IPs and lookup_file_hash on suspicious executables found in the alert.
Produce an investigation report covering the attack lifecycle.`,
  },
  {
    name: 'VerdictAgent',
    label: 'Verdict Rendering',
    role: `You are VerdictAgent, responsible for final triage decisions.
Based on ALL previous agent findings, determine the definitive verdict and confidence score.
Verdict must be one of: true_positive, false_positive, suspicious, benign.
Be precise, evidence-based, and cite specific findings that drove your conclusion.`,
  },
  {
    name: 'ResponseAgent',
    label: 'Response Planning',
    role: `You are ResponseAgent, a security response specialist.
Generate a prioritised, actionable response playbook. Include immediate containment actions, eradication steps, and recovery guidance.
Tailor recommendations to the specific threat identified by previous agents.`,
  },
  {
    name: 'ComplianceAgent',
    label: 'Compliance Check',
    role: `You are ComplianceAgent, a regulatory and compliance specialist.
Assess the compliance and regulatory implications of this security incident.
Determine GDPR, HIPAA, PCI-DSS, SOC 2, and NIST notification obligations and response timelines.
Identify any mandatory breach notification requirements based on data types and jurisdictions involved.`,
  },
] as const;

/* ── Result shape from each agent ───────────────────────────────── */

interface AgentResult {
  finding: string;
  detail: string;
  verdict?: Verdict;
  confidence?: number;
  toolCalls: ToolCall[];
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
      console.log('[AI] Real Claude AI agents enabled (with tool use)');
    } else {
      console.log('[AI] No ANTHROPIC_API_KEY — using simulation engine');
    }
    this.model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  }

  get hasRealAI(): boolean {
    return this.client !== null;
  }

  /* ── Main triage entry point ──────────────────────────────────── */

  async triageAlert(
    alert: Alert,
    onProgress: (step: AgentStep, index: number) => void,
  ): Promise<Alert> {
    if (!this.client) {
      return this.fallback.triageAlert(alert, onProgress);
    }

    const findings: string[] = [];
    alert.agentSteps = [];

    for (let i = 0; i < AGENT_CONFIGS.length; i++) {
      const cfg = AGENT_CONFIGS[i];

      /* Emit "running" immediately */
      const step: AgentStep = {
        agentName: cfg.name,
        agentLabel: cfg.label,
        status: 'running',
        startedAt: new Date().toISOString(),
        finding: '⏳ Analysing…',
        detail: '',
        toolCalls: [],
      };
      alert.agentSteps.push(step);
      onProgress({ ...step }, i);

      try {
        const t0 = Date.now();

        const result = await this.runAgent(cfg, alert, findings, (toolCall) => {
          /* Stream each tool call to the frontend in real-time */
          step.toolCalls = [...(step.toolCalls ?? []), toolCall];
          step.finding = `🔍 Called ${toolCall.tool}…`;
          onProgress({ ...step }, i);
        });

        step.status = 'complete';
        step.finding = result.finding;
        step.detail = result.detail;
        step.completedAt = new Date().toISOString();
        step.durationMs = Date.now() - t0;
        step.toolCalls = result.toolCalls;

        findings.push(result.finding);

        if (cfg.name === 'VerdictAgent' && result.verdict) {
          alert.verdict = result.verdict;
          alert.confidence = result.confidence ?? 70;
        }
      } catch (err) {
        console.error(`[AI] ${cfg.name} failed:`, err);
        step.status = 'error';
        step.finding = 'Agent encountered an error. Pipeline continuing.';
        step.completedAt = new Date().toISOString();
      }

      onProgress({ ...step }, i);
    }

    if (!alert.verdict || alert.verdict === 'pending') {
      alert.verdict = this.inferVerdict(alert);
      alert.confidence = 70;
    }

    alert.status = 'triaged';
    alert.triageCompletedAt = new Date().toISOString();
    return alert;
  }

  /* ── Agentic loop for one agent ──────────────────────────────── */

  private async runAgent(
    cfg: (typeof AGENT_CONFIGS)[number],
    alert: Alert,
    previousFindings: string[],
    onToolCall: (call: ToolCall) => void,
  ): Promise<AgentResult> {
    const client = this.client!;
    const isVerdictAgent = cfg.name === 'VerdictAgent';

    /* Build the available tools for this specific agent */
    const agentToolNames = AGENT_TOOLS[cfg.name] ?? [];
    const tools = SOC_TOOLS.filter((t) => agentToolNames.includes(t.name));

    /* Prompt */
    const alertSummary = JSON.stringify(
      {
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        source: alert.source,
        description: alert.description,
        affectedAssets: alert.affectedAssets?.map((a) => ({ type: a.type, value: a.value })),
        iocs: alert.iocs?.map((i) => ({ type: i.type, value: i.value })),
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

    const prompt = `ALERT:\n${alertSummary}${previousContext}

${isVerdictAgent
  ? 'Based on ALL agent findings above, give the final verdict.'
  : 'Analyse this alert from your specialist perspective. Use your tools to gather real intelligence before writing your analysis.'}

Respond with ONLY valid JSON:
${isVerdictAgent
  ? `{ "finding": "<verdict summary with evidence>", "detail": "<supporting detail>", "verdict": "<true_positive|false_positive|suspicious|benign>", "confidence": <0-100> }`
  : `{ "finding": "<key finding paragraph>", "detail": "<technical detail, sources used>" }`
}`;

    /* Agentic conversation loop */
    const messages: MessageParam[] = [{ role: 'user', content: prompt }];
    const allToolCalls: ToolCall[] = [];
    const MAX_LOOPS = 6; // prevent infinite loops

    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: cfg.role,
        tools: tools.length > 0 ? tools : undefined,
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        /* ── Execute all tool calls Claude requested ── */
        const toolUseBlocks = response.content.filter(
          (b): b is ToolUseBlock => b.type === 'tool_use',
        );

        const toolResults: ToolResultBlockParam[] = [];

        for (const tu of toolUseBlocks) {
          const output = executeTool(tu.name, tu.input as Record<string, string>);
          const toolCall: ToolCall = {
            tool: tu.name,
            input: tu.input as Record<string, unknown>,
            output,
            executedAt: new Date().toISOString(),
          };
          allToolCalls.push(toolCall);
          onToolCall(toolCall);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(output),
          });
        }

        /* Continue the conversation with tool results */
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

      } else {
        /* ── end_turn: extract final JSON response ── */
        const text = response.content
          .filter((b): b is TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');

        const parsed = this.parseAgentResponse(text, isVerdictAgent);
        return { ...parsed, toolCalls: allToolCalls };
      }
    }

    /* Fallback if loop exhausted */
    return {
      finding: 'Analysis complete (tool loop limit reached).',
      detail: '',
      toolCalls: allToolCalls,
    };
  }

  /* ── JSON response parser ────────────────────────────────────── */

  private parseAgentResponse(
    text: string,
    isVerdictAgent: boolean,
  ): Omit<AgentResult, 'toolCalls'> {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { finding: text.trim().substring(0, 400) || 'Analysis complete.', detail: '' };
    }
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        finding?: string;
        detail?: string;
        verdict?: string;
        confidence?: number;
      };
      const result: Omit<AgentResult, 'toolCalls'> = {
        finding: parsed.finding || 'Analysis complete.',
        detail: parsed.detail || '',
      };
      if (isVerdictAgent) {
        result.verdict = this.normaliseVerdict(parsed.verdict);
        result.confidence =
          typeof parsed.confidence === 'number'
            ? Math.min(100, Math.max(0, parsed.confidence))
            : 70;
      }
      return result;
    } catch {
      return { finding: text.substring(0, 400) || 'Analysis complete.', detail: '' };
    }
  }

  private normaliseVerdict(raw?: string): Verdict {
    if (!raw) return 'suspicious';
    const v = raw.toLowerCase().replace(/[^a-z_]/g, '');
    const valid: Verdict[] = ['true_positive', 'false_positive', 'suspicious', 'benign', 'pending'];
    return valid.includes(v as Verdict) ? (v as Verdict) : 'suspicious';
  }

  private inferVerdict(alert: Alert): Verdict {
    const t = alert.title.toLowerCase();
    if (t.includes('mimikatz') || t.includes('ransomware') || t.includes('c2')) return 'true_positive';
    if (t.includes('brute') || t.includes('lateral') || t.includes('cryptomining')) return 'true_positive';
    if (t.includes('impossible travel') || t.includes('privileged')) return 'suspicious';
    return 'suspicious';
  }
}
