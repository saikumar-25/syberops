import { Alert, AgentStep, ResponseAction, Verdict } from '../types';

export class AITriageEngine {
  async triageAlert(alert: Alert, onProgress: (step: AgentStep, index: number) => void): Promise<Alert> {
    const agents = [
      {
        name: 'AlertIntakeAgent',
        label: 'Alert Intake',
        delayMs: [400, 800],
      },
      {
        name: 'EnrichmentAgent',
        label: 'Enrichment',
        delayMs: [800, 1500],
      },
      {
        name: 'ThreatIntelAgent',
        label: 'Threat Intelligence',
        delayMs: [1000, 2000],
      },
      {
        name: 'CorrelationAgent',
        label: 'Correlation',
        delayMs: [600, 1200],
      },
      {
        name: 'InvestigationAgent',
        label: 'Investigation',
        delayMs: [1500, 3000],
      },
      {
        name: 'VerdictAgent',
        label: 'Verdict',
        delayMs: [500, 1000],
      },
      {
        name: 'ResponseAgent',
        label: 'Response Planning',
        delayMs: [400, 800],
      },
      {
        name: 'ComplianceAgent',
        label: 'Compliance',
        delayMs: [300, 600],
      },
    ];

    alert.agentSteps = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const delay = this.randomDelay(agent.delayMs[0], agent.delayMs[1]);

      const finding = this.generateFinding(alert, agent.name);
      const detail = this.generateDetail(alert, agent.name);

      const step: AgentStep = {
        agentName: agent.name,
        agentLabel: agent.label,
        status: 'pending',
        finding,
        detail,
      };

      alert.agentSteps.push(step);

      await this.sleep(delay);

      step.status = 'running';
      step.startedAt = new Date().toISOString();

      step.status = 'complete';
      step.completedAt = new Date().toISOString();
      step.durationMs = delay;

      onProgress(step, i);
    }

    alert.status = 'triaged';
    alert.triageCompletedAt = new Date().toISOString();

    const verdictResult = this.calculateVerdict(alert);
    alert.verdict = verdictResult.verdict;
    alert.confidence = verdictResult.confidence;

    alert.responseActions = this.generateResponseActions(alert, verdictResult.verdict);

    return alert;
  }

  private generateFinding(alert: Alert, agentName: string): string {
    const title = alert.title.toLowerCase();

    switch (agentName) {
      case 'AlertIntakeAgent':
        if (title.includes('mimikatz')) {
          return `Alert classified as CREDENTIAL_ACCESS event, severity ${alert.severity.toUpperCase()}. Source asset ${alert.affectedAssets[0]?.value || 'UNKNOWN'} is a domain controller. Process chain detected. Classification confidence: 98%.`;
        } else if (title.includes('brute force')) {
          return `Alert intake: Authentication attack vector detected. ${alert.affectedAssets.length} failed attempts aggregated. Source IP analysis queued. Severity: ${alert.severity}.`;
        } else if (title.includes('impossible travel')) {
          return `Anomalous user behavior detected: Geographic impossibility in login sequence. User ${alert.affectedAssets[0]?.value} flagged for review. Risk assessment: HIGH.`;
        }
        return `Alert parsed and classified as ${alert.severity.toUpperCase()} severity event. Initial threat assessment initiated.`;

      case 'EnrichmentAgent':
        return `Enrichment: ${alert.affectedAssets.length} assets identified. ${alert.iocs.length} IOCs correlated. Historical baseline comparison complete. Anomaly score: ${Math.floor(Math.random() * 100)}.`;

      case 'ThreatIntelAgent':
        const maliciousIocs = alert.iocs.filter((i) => i.malicious).length;
        if (maliciousIocs > 0) {
          return `IOC enrichment complete. ${maliciousIocs} malicious indicators found. VirusTotal matches (${Math.floor(Math.random() * 80) + 10}/90 engines). Greynoise: confirmed attacker. MITRE correlation verified.`;
        }
        return `Threat intelligence: No known malicious infrastructure detected. Potential false positive indicator. Continued monitoring recommended.`;

      case 'CorrelationAgent':
        return `Correlation analysis: ${Math.floor(Math.random() * 5)} related alerts in past 24h. Attack pattern recognition: ${Math.random() > 0.5 ? 'APT28 TTPs detected' : 'Custom attack pattern'}. Correlation score: ${Math.floor(Math.random() * 40) + 60}%.`;

      case 'InvestigationAgent':
        if (title.includes('mimikatz') || title.includes('credential')) {
          return `Deep analysis: Credential access mechanism confirmed. Memory dump attempted. Privilege escalation chain identified. Full attacker chain reconstruction possible. Confidence: 97%.`;
        } else if (title.includes('ransomware')) {
          return `Investigation: File encryption pattern matches known ransomware. ${Math.floor(Math.random() * 5000) + 1000} files encrypted in 2-minute window. Variant identification: ${['REvil', 'Lockbit', 'BlackCat'][Math.floor(Math.random() * 3)]}.`;
        }
        return `Investigation: Behavioral analysis shows ${alert.severity === 'critical' ? 'confirmed malicious activity' : 'suspicious but inconclusive patterns'}. Further evidence collection needed.`;

      case 'VerdictAgent':
        const isHighConfidence = alert.severity === 'critical' || title.includes('mimikatz');
        if (isHighConfidence) {
          return `VERDICT: TRUE POSITIVE (${Math.floor(Math.random() * 10) + 90}% confidence). Immediate containment required. SLA risk: HIGH if not contained within 15 minutes.`;
        }
        return `VERDICT: Assessment complete. ${Math.random() > 0.5 ? 'TRUE POSITIVE' : 'FALSE POSITIVE'} with ${Math.floor(Math.random() * 40) + 50}% confidence. Further investigation needed.`;

      case 'ResponseAgent':
        return `Response: ${Math.floor(Math.random() * 3) + 2} critical actions identified. Isolation recommended. Credential reset initiated. Logs collected for forensic analysis.`;

      case 'ComplianceAgent':
        return `Compliance: GDPR notification required. HIPAA logging verified. Audit trail complete. ${['PCI-DSS', 'SOC2', 'NIST'][Math.floor(Math.random() * 3)]} standards compliance confirmed.`;

      default:
        return 'Agent processing complete.';
    }
  }

  private generateDetail(alert: Alert, agentName: string): string {
    const assetCount = alert.affectedAssets.length;
    const iocCount = alert.iocs.length;

    switch (agentName) {
      case 'AlertIntakeAgent':
        return `Raw event parsed. Field mapping: ${assetCount} assets, ${iocCount} IOCs detected. Severity override: none. Processing timestamp: ${new Date().toISOString()}`;

      case 'EnrichmentAgent':
        return `WHOIS lookup completed for ${alert.affectedAssets.filter((a) => a.type === 'ip').length} IPs. GeoIP data: US, Russia, China. OSINT correlation: 12 additional events found. Asset criticality scoring: 78%.`;

      case 'ThreatIntelAgent':
        return `${iocCount} IOCs checked against 47 threat feeds. Feed status: 45 operational, 2 degraded. Last update: 2 minutes ago. Hash matching: ${Math.floor(Math.random() * 80) + 10}% database coverage.`;

      case 'CorrelationAgent':
        return `Cross-correlation complete. Timeframe: 72 hours. Similar event clusters: ${Math.floor(Math.random() * 3) + 1}. Correlation strength: ${Math.floor(Math.random() * 40) + 60}%. Campaign assessment: Possible coordinated activity.`;

      case 'InvestigationAgent':
        return `Behavioral timeline: Event occurred at ${new Date(alert.timestamp).toLocaleTimeString()}. Parent process: system. Network connections: 3 external IPs. File system activity: ${Math.floor(Math.random() * 50000) + 10000} files accessed. Execution context: LocalSystem.`;

      case 'VerdictAgent':
        return `Evidence aggregation: ${Math.floor(Math.random() * 50) + 50} supporting indicators. Counter-indicators: ${Math.floor(Math.random() * 20)}. ML model score: ${(Math.random() * 0.5 + 0.5).toFixed(3)}. Final determination: Legitimate threat detected.`;

      case 'ResponseAgent':
        return `Recommended actions: (1) Isolate ${alert.affectedAssets[0]?.value || 'host'} from network. (2) Reset credentials for affected users. (3) Deploy EDR sensors. (4) Create SNOW ticket. Estimated containment time: 15 minutes.`;

      case 'ComplianceAgent':
        return `Regulatory checklist: Incident notification required per state law (NY, CA). Data exposure assessment: No PII confirmed. Mandatory reporting timeline: 72 hours. Stakeholders notified: Legal, Compliance, Board.`;

      default:
        return 'Processing complete.';
    }
  }

  private calculateVerdict(alert: Alert): { verdict: Verdict; confidence: number } {
    const title = alert.title.toLowerCase();
    

    let baseConfidence = 50;
    let verdict: Verdict = 'pending';

    if (title.includes('mimikatz') || title.includes('credential dumping') || title.includes('ransomware')) {
      baseConfidence = 95;
      verdict = 'true_positive';
    } else if (title.includes('brute force')) {
      baseConfidence = Math.random() > 0.35 ? 75 : 45;
      verdict = baseConfidence > 70 ? 'true_positive' : 'suspicious';
    } else if (title.includes('impossible travel')) {
      baseConfidence = Math.random() > 0.55 ? 65 : 35;
      verdict = baseConfidence > 60 ? 'true_positive' : 'false_positive';
    } else if (title.includes('cryptomining')) {
      baseConfidence = 82;
      verdict = 'true_positive';
    } else if (title.includes('lateral movement') || title.includes('wmi')) {
      baseConfidence = 70;
      verdict = 'true_positive';
    } else if (title.includes('spearphishing')) {
      baseConfidence = 60;
      verdict = 'suspicious';
    } else if (title.includes('privileged')) {
      baseConfidence = Math.random() > 0.65 ? 50 : 30;
      verdict = baseConfidence > 45 ? 'suspicious' : 'false_positive';
    } else if (title.includes('c2 beacon')) {
      baseConfidence = 88;
      verdict = 'true_positive';
    } else {
      verdict = 'pending';
      baseConfidence = 50;
    }

    const variation = (Math.random() - 0.5) * 10;
    const confidence = Math.min(99, Math.max(20, baseConfidence + variation));

    return { verdict, confidence };
  }

  private generateResponseActions(alert: Alert, verdict: Verdict): ResponseAction[] {
    const actions: ResponseAction[] = [];

    if (verdict === 'true_positive') {
      const targetHost = alert.affectedAssets.find((a) => a.type === 'host');
      if (targetHost) {
        actions.push({
          id: 'action-1',
          type: 'isolate_host',
          label: `Isolate ${targetHost.value}`,
          description: `Remove host from network and disable all connectivity`,
          priority: 'immediate',
          status: 'pending',
        });
      }

      const targetUser = alert.affectedAssets.find((a) => a.type === 'user');
      if (targetUser) {
        actions.push({
          id: 'action-2',
          type: 'reset_password',
          label: `Reset password for ${targetUser.value}`,
          description: `Force password reset and revoke active sessions`,
          priority: 'urgent',
          status: 'pending',
        });
      }

      const targetIp = alert.affectedAssets.find((a) => a.type === 'ip');
      if (targetIp) {
        actions.push({
          id: 'action-3',
          type: 'block_ip',
          label: `Block IP ${targetIp.value}`,
          description: `Add to firewall blocklist across all segments`,
          priority: 'urgent',
          status: 'pending',
        });
      }

      actions.push({
        id: 'action-4',
        type: 'collect_logs',
        label: 'Collect forensic logs',
        description: `Gather endpoint logs, network flows, and event logs for analysis`,
        priority: 'urgent',
        status: 'pending',
      });

      actions.push({
        id: 'action-5',
        type: 'create_ticket',
        label: 'Create incident ticket',
        description: `SNOW ticket for escalation and tracking`,
        priority: 'urgent',
        status: 'pending',
      });

      actions.push({
        id: 'action-6',
        type: 'notify',
        label: 'Notify security team',
        description: `Alert CISO and SOC leadership`,
        priority: 'immediate',
        status: 'pending',
      });
    } else if (verdict === 'suspicious') {
      actions.push({
        id: 'action-1',
        type: 'collect_logs',
        label: 'Collect additional evidence',
        description: `Gather more context for investigation`,
        priority: 'normal',
        status: 'pending',
      });

      actions.push({
        id: 'action-2',
        type: 'create_ticket',
        label: 'Create investigation ticket',
        description: `Queue for analyst review`,
        priority: 'normal',
        status: 'pending',
      });
    }

    return actions;
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
