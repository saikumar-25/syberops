/**
 * SyberOps — AI Triage Simulation Engine
 *
 * Produces the same agentic UX as the real Claude pipeline:
 * tool calls stream in real-time, each with realistic output,
 * followed by a findings summary per agent.
 *
 * Used when no ANTHROPIC_API_KEY is set (demo / offline mode).
 */

import { Alert, AgentStep, ToolCall, ResponseAction, Verdict } from '../types';
import { executeTool } from './tools';

export class AITriageEngine {

  async triageAlert(
    alert: Alert,
    onProgress: (step: AgentStep, index: number) => void,
  ): Promise<Alert> {
    alert.agentSteps = [];

    const AGENTS = [
      { name: 'AlertIntakeAgent',   label: 'Alert Intake',       baseMs: 600  },
      { name: 'EnrichmentAgent',    label: 'Context Enrichment', baseMs: 1100 },
      { name: 'ThreatIntelAgent',   label: 'Threat Intelligence',baseMs: 1400 },
      { name: 'CorrelationAgent',   label: 'Alert Correlation',  baseMs: 900  },
      { name: 'InvestigationAgent', label: 'Deep Investigation', baseMs: 1800 },
      { name: 'VerdictAgent',       label: 'Verdict Rendering',  baseMs: 700  },
      { name: 'ResponseAgent',      label: 'Response Planning',  baseMs: 600  },
      { name: 'ComplianceAgent',    label: 'Compliance Check',   baseMs: 500  },
    ];

    for (let i = 0; i < AGENTS.length; i++) {
      const cfg = AGENTS[i];

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

      const t0 = Date.now();

      /* ── Stream simulated tool calls ── */
      const calls = this.buildToolCalls(cfg.name, alert);
      for (const call of calls) {
        await this.sleep(280 + Math.random() * 220);
        step.toolCalls = [...(step.toolCalls ?? []), call];
        step.finding = `🔍 Called ${call.tool}…`;
        onProgress({ ...step }, i);
      }

      /* ── Wait for remaining agent "think" time ── */
      const elapsed = Date.now() - t0;
      const remaining = cfg.baseMs - elapsed + Math.random() * 400;
      if (remaining > 0) await this.sleep(remaining);

      step.status = 'complete';
      step.finding = this.generateFinding(alert, cfg.name);
      step.detail = this.generateDetail(alert, cfg.name);
      step.completedAt = new Date().toISOString();
      step.durationMs = Date.now() - t0;

      onProgress({ ...step }, i);
    }

    alert.status = 'triaged';
    alert.triageCompletedAt = new Date().toISOString();

    const { verdict, confidence } = this.calculateVerdict(alert);
    alert.verdict = verdict;
    alert.confidence = confidence;
    alert.responseActions = this.generateResponseActions(alert, verdict);

    return alert;
  }

  /* ── Build realistic tool calls per agent ─────────────────────── */

  private buildToolCalls(agentName: string, alert: Alert): ToolCall[] {
    const calls: ToolCall[] = [];
    const now = new Date().toISOString();

    const firstIP      = alert.iocs.find((i) => i.type === 'ip')?.value;
    const firstDomain  = alert.iocs.find((i) => i.type === 'domain')?.value
                      ?? alert.affectedAssets.find((a) => a.type === 'domain')?.value;
    const firstHash    = alert.iocs.find((i) => i.type === 'hash')?.value;
    const firstHost    = alert.affectedAssets.find((a) => a.type === 'host')?.value;
    const firstUser    = alert.affectedAssets.find((a) => a.type === 'user')?.value;
    const firstMitre   = alert.mitreTechniques?.[0]?.id;

    const tool = (name: string, input: Record<string, string>): ToolCall => ({
      tool: name,
      input,
      output: executeTool(name, input),
      executedAt: now,
    });

    switch (agentName) {

      case 'AlertIntakeAgent':
        if (firstMitre) {
          calls.push(tool('search_mitre_attack', { query: firstMitre }));
        }
        if (firstIP) {
          calls.push(tool('lookup_ip_reputation', { ip: firstIP }));
        }
        break;

      case 'EnrichmentAgent':
        if (firstHost) {
          calls.push(tool('get_asset_risk_profile', { asset_identifier: firstHost, asset_type: 'host' }));
        }
        if (firstUser) {
          calls.push(tool('get_asset_risk_profile', { asset_identifier: firstUser, asset_type: 'user' }));
        }
        if (firstIP) {
          calls.push(tool('lookup_ip_reputation', { ip: firstIP }));
        }
        if (firstDomain) {
          calls.push(tool('lookup_domain_reputation', { domain: firstDomain }));
        }
        break;

      case 'ThreatIntelAgent':
        if (firstHash) {
          calls.push(tool('lookup_file_hash', { hash: firstHash }));
        }
        if (firstMitre) {
          calls.push(tool('search_mitre_attack', { query: firstMitre }));
        }
        if (firstIP) {
          calls.push(tool('lookup_ip_reputation', { ip: firstIP }));
        }
        if (firstDomain) {
          calls.push(tool('lookup_domain_reputation', { domain: firstDomain }));
        }
        break;

      case 'CorrelationAgent':
        if (firstHost) {
          calls.push(tool('get_asset_risk_profile', { asset_identifier: firstHost, asset_type: 'host' }));
        }
        if (firstIP) {
          calls.push(tool('lookup_ip_reputation', { ip: firstIP }));
        }
        break;

      case 'InvestigationAgent':
        if (firstIP) {
          calls.push(tool('lookup_ip_reputation', { ip: firstIP }));
        }
        if (firstHash) {
          calls.push(tool('lookup_file_hash', { hash: firstHash }));
        }
        if (firstDomain) {
          calls.push(tool('lookup_domain_reputation', { domain: firstDomain }));
        }
        break;

      /* VerdictAgent, ResponseAgent, ComplianceAgent use no tools */
      default:
        break;
    }

    return calls;
  }

  /* ── Findings text per agent ──────────────────────────────────── */

  private generateFinding(alert: Alert, agentName: string): string {
    const title = alert.title.toLowerCase();
    const sev   = alert.severity.toUpperCase();
    const host  = alert.affectedAssets.find((a) => a.type === 'host')?.value ?? 'UNKNOWN';
    const maliciousIocs = alert.iocs.filter((i) => i.malicious).length;

    switch (agentName) {
      case 'AlertIntakeAgent':
        if (title.includes('mimikatz'))
          return `Alert classified as CREDENTIAL_ACCESS event (${sev}). Source asset ${host} is a domain controller. Process chain: system → lsass.exe → mimikatz.exe confirmed. Classification confidence: 98%.`;
        if (title.includes('brute force'))
          return `Authentication attack detected (${sev}). ${alert.affectedAssets.length} targeted accounts. Throttling pattern consistent with automated credential stuffing.`;
        if (title.includes('impossible travel'))
          return `Anomalous login behaviour: Geographic impossibility confirmed. User session crossed international boundaries in < 10 minutes — physically impossible. Risk: HIGH.`;
        if (title.includes('ransomware'))
          return `Mass file encryption event (${sev}). Alert intake complete — immediate escalation required. Encryption process active on ${host}.`;
        if (title.includes('c2') || title.includes('beacon'))
          return `C2 communication pattern identified (${sev}). Periodic beaconing interval suggests automated C2 framework. Infrastructure attribution in progress.`;
        return `Alert parsed and classified: ${sev} severity ${alert.source} event. ${alert.affectedAssets.length} assets, ${alert.iocs.length} IOCs extracted. Triage initiated.`;

      case 'EnrichmentAgent':
        return `Enrichment complete. ${alert.affectedAssets.length} assets profiled. ${maliciousIocs > 0 ? `${maliciousIocs} IOCs confirmed malicious across threat feeds.` : 'No known malicious infrastructure.'} Asset risk scoring and historical baseline complete.`;

      case 'ThreatIntelAgent':
        if (maliciousIocs > 0)
          return `Threat intelligence: ${maliciousIocs}/${alert.iocs.length} IOCs confirmed malicious. VirusTotal and AbuseIPDB cross-reference complete. MITRE ATT&CK technique attribution confirmed. Possible APT involvement.`;
        return `Threat intelligence: IOC analysis complete. No strong attribution to known threat actors. Behavioural pattern analysis suggests opportunistic attacker. Monitoring recommended.`;

      case 'CorrelationAgent':
        return `Correlation: ${Math.floor(Math.random() * 4) + 1} related alerts in the past 48h on the same asset cluster. Attack chain partially reconstructed. ${Math.random() > 0.5 ? 'APT28 TTPs consistent with observed behaviour.' : 'Pattern consistent with commodity malware campaign.'}`;

      case 'InvestigationAgent':
        if (title.includes('mimikatz') || title.includes('credential'))
          return `Investigation confirmed: Credential access chain fully reconstructed. LSASS memory dump succeeded. Lateral movement via pass-the-hash likely next. Full attacker kill-chain documented.`;
        if (title.includes('ransomware'))
          return `Ransomware investigation: ${Math.floor(Math.random() * 5000) + 1000} files encrypted in < 3 minutes. Shadow copies targeted. Variant: ${['LockBit 3.0', 'BlackCat/ALPHV', 'Cl0p'][Math.floor(Math.random() * 3)]}. Exfiltration prior to encryption suspected.`;
        return `Investigation: Behavioural analysis ${alert.severity === 'critical' ? 'confirms active threat — immediate response required.' : 'shows suspicious activity — further evidence collection needed.'}`;

      case 'VerdictAgent':
        if (title.includes('mimikatz') || title.includes('ransomware') || title.includes('c2'))
          return `VERDICT: TRUE_POSITIVE (${Math.floor(Math.random() * 8) + 90}% confidence). Active threat confirmed. Immediate containment required. SLA breach risk in < 15 minutes.`;
        if (title.includes('brute force') || title.includes('lateral'))
          return `VERDICT: TRUE_POSITIVE (${Math.floor(Math.random() * 20) + 70}% confidence). Genuine attack confirmed despite some noise. Response playbook triggered.`;
        if (title.includes('impossible travel'))
          return `VERDICT: ${Math.random() > 0.5 ? 'SUSPICIOUS (55% confidence). Possible account compromise — MFA reset recommended.' : 'FALSE_POSITIVE (68% confidence). VPN usage explains geographic anomaly.'}`;
        return `VERDICT: SUSPICIOUS (${Math.floor(Math.random() * 30) + 50}% confidence). Inconclusive — additional investigation recommended.`;

      case 'ResponseAgent':
        return `Response playbook generated. ${Math.floor(Math.random() * 3) + 3} priority actions queued. Network isolation, credential reset, and forensic collection recommended. Estimated containment time: 15–20 min.`;

      case 'ComplianceAgent':
        return `Compliance assessment: GDPR Article 33 notification required within 72h. HIPAA Breach Rule applies if PHI involved. PCI-DSS incident log updated. Regulatory timeline initiated.`;

      default:
        return 'Analysis complete.';
    }
  }

  private generateDetail(alert: Alert, agentName: string): string {
    const assetCount = alert.affectedAssets.length;
    const iocCount   = alert.iocs.length;

    switch (agentName) {
      case 'AlertIntakeAgent':
        return `Raw event parsed. ${assetCount} assets, ${iocCount} IOCs mapped. No severity override applied. Ingestion latency: ${Math.floor(Math.random() * 200) + 50}ms.`;
      case 'EnrichmentAgent':
        return `GeoIP resolved for ${alert.affectedAssets.filter((a) => a.type === 'ip').length} IPs. OSINT correlation: ${Math.floor(Math.random() * 15) + 5} external references. Asset criticality: ${Math.floor(Math.random() * 30) + 70}%.`;
      case 'ThreatIntelAgent':
        return `${iocCount} IOCs checked across 47 threat feeds. Feed freshness: 98% updated within 1h. Confidence-weighted scoring applied. Hash coverage: ${Math.floor(Math.random() * 15) + 82}%.`;
      case 'CorrelationAgent':
        return `72-hour lookback window. ${Math.floor(Math.random() * 3) + 1} overlapping alert clusters identified. Correlation method: IOC intersection + temporal proximity + asset overlap.`;
      case 'InvestigationAgent':
        return `Event timeline: T+0s alert fired. T+${Math.floor(Math.random() * 30) + 5}s lateral movement. T+${Math.floor(Math.random() * 120) + 60}s C2 check-in. Parent process tree extracted. ${Math.floor(Math.random() * 30000) + 10000} file ops analysed.`;
      case 'VerdictAgent':
        return `Decision factors: ${Math.floor(Math.random() * 40) + 40} supporting indicators, ${Math.floor(Math.random() * 10)} counter-indicators. ML ensemble score: ${(Math.random() * 0.3 + 0.7).toFixed(3)}. Human review override: none.`;
      case 'ResponseAgent':
        return `Recommended: (1) Isolate ${alert.affectedAssets[0]?.value ?? 'affected host'}. (2) Reset credentials. (3) Deploy EDR containment policy. (4) Collect memory dump + network flows. (5) Raise SNOW P1 ticket.`;
      case 'ComplianceAgent':
        return `Regulatory checklist: GDPR ✓ HIPAA ✓ PCI-DSS ✓ SOC 2 ✓. Data exposure: under assessment. Board notification: pending CISO sign-off. Evidence preservation: active.`;
      default:
        return '';
    }
  }

  /* ── Verdict logic ────────────────────────────────────────────── */

  private calculateVerdict(alert: Alert): { verdict: Verdict; confidence: number } {
    const t = alert.title.toLowerCase();
    let base = 50;
    let verdict: Verdict = 'suspicious';

    if (t.includes('mimikatz') || t.includes('credential dumping')) { base = 95; verdict = 'true_positive'; }
    else if (t.includes('ransomware'))                               { base = 95; verdict = 'true_positive'; }
    else if (t.includes('c2 beacon') || t.includes('cryptomining')) { base = 88; verdict = 'true_positive'; }
    else if (t.includes('lateral movement') || t.includes('wmi'))   { base = 72; verdict = 'true_positive'; }
    else if (t.includes('brute force'))                              { base = 68; verdict = 'true_positive'; }
    else if (t.includes('impossible travel'))                        { base = Math.random() > 0.5 ? 58 : 32; verdict = base > 50 ? 'suspicious' : 'false_positive'; }
    else if (t.includes('spearphishing'))                            { base = 62; verdict = 'suspicious'; }
    else if (t.includes('privileged'))                               { base = Math.random() > 0.6 ? 48 : 28; verdict = base > 42 ? 'suspicious' : 'false_positive'; }
    else if (t.includes('mfa bypass'))                               { base = 80; verdict = 'true_positive'; }

    const confidence = Math.min(99, Math.max(20, base + (Math.random() - 0.5) * 10));
    return { verdict, confidence };
  }

  /* ── Response actions ─────────────────────────────────────────── */

  private generateResponseActions(alert: Alert, verdict: Verdict): ResponseAction[] {
    if (verdict !== 'true_positive' && verdict !== 'suspicious') return [];

    const actions: ResponseAction[] = [];
    const host = alert.affectedAssets.find((a) => a.type === 'host');
    const user = alert.affectedAssets.find((a) => a.type === 'user');
    const ip   = alert.affectedAssets.find((a) => a.type === 'ip');

    if (verdict === 'true_positive') {
      if (host)  actions.push({ id: 'a1', type: 'isolate_host',  label: `Isolate ${host.value}`,           description: 'Remove from network and disable all connectivity',           priority: 'immediate', status: 'pending' });
      if (user)  actions.push({ id: 'a2', type: 'reset_password', label: `Reset credentials for ${user.value}`, description: 'Force reset + revoke all active sessions',         priority: 'urgent',    status: 'pending' });
      if (ip)    actions.push({ id: 'a3', type: 'block_ip',       label: `Block ${ip.value}`,               description: 'Add to firewall blocklist across all network segments', priority: 'urgent',    status: 'pending' });
                 actions.push({ id: 'a4', type: 'collect_logs',   label: 'Collect forensic evidence',       description: 'Memory dump, network flows, EDR telemetry',             priority: 'urgent',    status: 'pending' });
                 actions.push({ id: 'a5', type: 'create_ticket',  label: 'Raise P1 incident ticket',        description: 'Create SNOW ticket for escalation and tracking',        priority: 'urgent',    status: 'pending' });
                 actions.push({ id: 'a6', type: 'notify',         label: 'Notify CISO + SOC lead',          description: 'Immediate notification per incident response plan',     priority: 'immediate', status: 'pending' });
    } else {
      actions.push({ id: 'a1', type: 'collect_logs',  label: 'Collect additional evidence', description: 'Gather more context for investigation', priority: 'normal', status: 'pending' });
      actions.push({ id: 'a2', type: 'create_ticket', label: 'Create investigation ticket', description: 'Queue for analyst review',               priority: 'normal', status: 'pending' });
    }

    return actions;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
