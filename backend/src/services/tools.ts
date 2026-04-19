/**
 * SyberOps — SOC Tool Definitions & Implementations
 *
 * These tools are given to Claude agents so they can actually query
 * threat intelligence, look up IOCs, and search MITRE ATT&CK — making
 * the pipeline genuinely agentic (not just sequential LLM calls).
 *
 * Implementations are high-fidelity mocks: deterministic, realistic,
 * and consistent (same input always returns same output).
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/* ── Tool Definitions (Anthropic format) ────────────────────────── */

export const SOC_TOOLS: Tool[] = [
  {
    name: 'lookup_ip_reputation',
    description:
      'Query threat intelligence feeds to assess an IP address reputation. Returns threat score, geolocation, ASN, associated threat actors, and malicious activity tags.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ip: { type: 'string', description: 'IPv4 or IPv6 address to look up' },
      },
      required: ['ip'],
    },
  },
  {
    name: 'lookup_file_hash',
    description:
      'Check a file hash (MD5, SHA1, or SHA256) against malware databases including VirusTotal, MalwareBazaar, and Hybrid Analysis. Returns malware family, detection rate, and behavioural tags.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hash: { type: 'string', description: 'File hash to query (MD5/SHA1/SHA256)' },
      },
      required: ['hash'],
    },
  },
  {
    name: 'search_mitre_attack',
    description:
      'Search the MITRE ATT&CK knowledge base for a technique by ID (e.g. T1003.001) or name. Returns technique details, associated threat groups, mitigations, and detection guidance.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Technique ID (e.g. T1003, T1003.001) or technique/tactic name',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'lookup_domain_reputation',
    description:
      'Check a domain name against threat intelligence for malicious activity, phishing, C2 infrastructure, or newly-registered suspicious domains.',
    input_schema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Fully-qualified domain name to check' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_asset_risk_profile',
    description:
      'Retrieve historical security risk data for an asset (host, user account, IP, or domain). Returns risk score, recent alert history, known vulnerabilities, and privilege level.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_identifier: {
          type: 'string',
          description: 'Asset hostname, username, IP address, or domain',
        },
        asset_type: {
          type: 'string',
          enum: ['host', 'user', 'ip', 'domain'],
          description: 'Type of the asset',
        },
      },
      required: ['asset_identifier', 'asset_type'],
    },
  },
];

/* ── Tool subsets per agent (keeps each agent focused) ──────────── */

export const AGENT_TOOLS: Record<string, string[]> = {
  AlertIntakeAgent:   ['search_mitre_attack', 'lookup_ip_reputation'],
  EnrichmentAgent:    ['lookup_ip_reputation', 'lookup_domain_reputation', 'get_asset_risk_profile'],
  ThreatIntelAgent:   ['lookup_file_hash', 'search_mitre_attack', 'lookup_ip_reputation', 'lookup_domain_reputation'],
  CorrelationAgent:   ['get_asset_risk_profile', 'lookup_ip_reputation'],
  InvestigationAgent: ['lookup_ip_reputation', 'lookup_file_hash', 'lookup_domain_reputation'],
  VerdictAgent:       [],
  ResponseAgent:      [],
  ComplianceAgent:    [],
};

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Deterministic int from a string — same seed always gives same result */
function deterministicInt(seed: string, max: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h % max;
}

function isPrivateIP(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('127.') ||
    ip.startsWith('::1') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/* ── Tool Implementations ────────────────────────────────────────── */

function lookup_ip_reputation(ip: string): Record<string, unknown> {
  if (isPrivateIP(ip)) {
    return {
      ip,
      verdict: 'benign',
      threat_score: 0,
      classification: 'private_network',
      country: 'Internal',
      tags: ['rfc1918', 'private'],
      note: 'Private / RFC 1918 address — not routable on public internet.',
    };
  }

  const score = deterministicInt(ip, 100);
  const malicious = score >= 60;

  const COUNTRIES = ['RU', 'CN', 'IR', 'KP', 'UA', 'DE', 'NL', 'US', 'BR', 'IN'];
  const ISPS = [
    'Selectel Ltd', 'Leaseweb Deutschland GmbH', 'M247 Europe SRL',
    'Frantech Solutions', 'DigitalOcean LLC', 'AS-CHOOPA Vultr',
    'OVH SAS', 'Hetzner Online GmbH', 'Cogent Communications',
  ];
  const THREAT_TAGS_POOL = ['c2', 'botnet', 'tor-exit-node', 'scanner', 'brute-force', 'phishing', 'cryptomining', 'spam'];
  const country = COUNTRIES[deterministicInt(ip + 'country', COUNTRIES.length)];
  const isp     = ISPS[deterministicInt(ip + 'isp', ISPS.length)];
  const asn     = `AS${10000 + deterministicInt(ip + 'asn', 50000)}`;
  const tags    = malicious
    ? THREAT_TAGS_POOL.slice(0, 2 + deterministicInt(ip + 'tags', 3))
    : ['clean'];

  return {
    ip,
    verdict: malicious ? 'malicious' : score >= 35 ? 'suspicious' : 'clean',
    threat_score: score,
    country,
    city: ['Moscow', 'Amsterdam', 'Frankfurt', 'Shenzhen', 'Tehran', 'São Paulo'][deterministicInt(ip + 'city', 6)],
    isp,
    asn,
    tags,
    reports_count: malicious ? 50 + deterministicInt(ip + 'rc', 200) : deterministicInt(ip + 'rc', 5),
    first_reported: daysAgo(30 + deterministicInt(ip + 'fr', 300)),
    last_reported: daysAgo(deterministicInt(ip + 'lr', 7)),
    threat_feeds: malicious ? ['AbuseIPDB', 'Spamhaus', 'EmergingThreats'] : [],
  };
}

function lookup_file_hash(hash: string): Record<string, unknown> {
  // Simple heuristic: hashes with high character entropy → likely malicious
  const score = deterministicInt(hash, 100);
  const malicious = score >= 50;

  const FAMILIES = [
    'Mimikatz', 'Cobalt Strike Beacon', 'Metasploit Meterpreter',
    'Emotet', 'TrickBot', 'Ryuk Ransomware', 'BlackCat Ransomware',
    'AsyncRAT', 'NjRAT', 'AgentTesla', 'RedLine Stealer',
  ];
  const AV_VENDORS = [
    'Microsoft', 'CrowdStrike', 'SentinelOne', 'Carbon Black',
    'Sophos', 'Symantec', 'Kaspersky', 'ESET', 'Trend Micro', 'McAfee',
  ];

  const family = malicious ? FAMILIES[deterministicInt(hash + 'fam', FAMILIES.length)] : null;
  const detectionCount = malicious ? 60 + deterministicInt(hash + 'det', 29) : deterministicInt(hash + 'det', 4);
  const totalEngines = 90;

  return {
    hash,
    hash_type: hash.length === 32 ? 'md5' : hash.length === 40 ? 'sha1' : 'sha256',
    verdict: malicious ? 'malicious' : score >= 30 ? 'suspicious' : 'clean',
    detection_rate: `${detectionCount}/${totalEngines}`,
    malware_family: family,
    malware_type: family
      ? family.toLowerCase().includes('ransomware') ? 'ransomware'
        : family.toLowerCase().includes('beacon') || family.toLowerCase().includes('rat') ? 'remote_access_trojan'
        : family.toLowerCase().includes('stealer') ? 'infostealer'
        : 'hacktool'
      : null,
    file_type: 'PE32 executable (Windows)',
    first_seen: daysAgo(30 + deterministicInt(hash + 'fs', 365)),
    last_seen: daysAgo(deterministicInt(hash + 'ls', 14)),
    av_labels: malicious
      ? AV_VENDORS.slice(0, 3 + deterministicInt(hash + 'av', 4)).map(
          (v) => `${v}:${family?.replace(' ', '.') ?? 'Hacktool'}.Gen`
        )
      : [],
    sources: malicious ? ['VirusTotal', 'MalwareBazaar', 'Hybrid Analysis'] : ['VirusTotal'],
  };
}

const MITRE_DB: Record<string, Record<string, unknown>> = {
  'T1003':     { technique_id: 'T1003',     name: 'OS Credential Dumping',              tactic: 'Credential Access', tactic_id: 'TA0006', platforms: ['Windows','Linux','macOS'], groups: ['APT28','FIN6','Lazarus Group'], tools: ['Mimikatz','ProcDump'], mitigations: ['Credential Access Protection','Privileged Account Management'], detection: 'Monitor processes accessing LSASS memory; alert on SAM database reads.' },
  'T1003.001': { technique_id: 'T1003.001', name: 'LSASS Memory',                       tactic: 'Credential Access', tactic_id: 'TA0006', platforms: ['Windows'], groups: ['APT28','FIN6','Lazarus Group'], tools: ['Mimikatz','ProcDump','Windows Credential Editor'], mitigations: ['Credential Guard','Privileged Account Management','Operating System Configuration'], detection: 'Detect tools like Mimikatz; monitor OpenProcess calls on lsass.exe.' },
  'T1059':     { technique_id: 'T1059',     name: 'Command and Scripting Interpreter',  tactic: 'Execution',         tactic_id: 'TA0002', platforms: ['Windows','Linux','macOS'], groups: ['APT41','Turla','Lazarus Group'], tools: ['PowerShell','cmd.exe','bash'], mitigations: ['Code Signing','Execution Prevention','Privileged Account Management'], detection: 'Log process creation; script block logging; AMSI telemetry.' },
  'T1059.001': { technique_id: 'T1059.001', name: 'PowerShell',                         tactic: 'Execution',         tactic_id: 'TA0002', platforms: ['Windows'], groups: ['APT28','APT29','FIN7'], tools: ['PowerShell Empire','PowerSploit'], mitigations: ['Antimalware Scan Interface','Code Signing','Disable or Remove Feature or Program'], detection: 'Enable PowerShell Script Block Logging and Transcription.' },
  'T1071':     { technique_id: 'T1071',     name: 'Application Layer Protocol',         tactic: 'Command and Control', tactic_id: 'TA0011', platforms: ['Windows','Linux','macOS'], groups: ['APT29','Turla','Kimsuky'], tools: ['Cobalt Strike','Metasploit'], mitigations: ['Network Intrusion Prevention','Filter Network Traffic'], detection: 'Analyse network traffic for anomalous patterns; beaconing intervals.' },
  'T1071.001': { technique_id: 'T1071.001', name: 'Web Protocols (HTTP/S C2)',           tactic: 'Command and Control', tactic_id: 'TA0011', platforms: ['Windows','Linux','macOS'], groups: ['APT29','Turla','Kimsuky'], tools: ['Cobalt Strike Beacon','AsyncRAT'], mitigations: ['Network Intrusion Prevention','SSL/TLS Inspection'], detection: 'Look for periodic beaconing patterns; JA3 fingerprinting; unusual user-agents.' },
  'T1078':     { technique_id: 'T1078',     name: 'Valid Accounts',                     tactic: 'Defense Evasion',   tactic_id: 'TA0005', platforms: ['Windows','Linux','macOS','Azure AD','SaaS'], groups: ['APT29','FIN4','Scattered Spider'], tools: [], mitigations: ['Multi-Factor Authentication','Privileged Account Management','Password Policies'], detection: 'Monitor for logins from unusual locations/times; impossible travel alerts.' },
  'T1110':     { technique_id: 'T1110',     name: 'Brute Force',                        tactic: 'Credential Access', tactic_id: 'TA0006', platforms: ['Windows','Linux','macOS','Azure AD'], groups: ['APT28','Scattered Spider','Anonymous'], tools: ['Hydra','Medusa','CrackMapExec'], mitigations: ['Account Lockout Policy','Multi-Factor Authentication','Password Policies'], detection: 'Alert on N failed logins in M seconds; geo-velocity checks.' },
  'T1486':     { technique_id: 'T1486',     name: 'Data Encrypted for Impact',          tactic: 'Impact',            tactic_id: 'TA0040', platforms: ['Windows','Linux','macOS'], groups: ['Ryuk','LockBit','BlackCat','Conti'], tools: ['Ryuk','LockBit','BlackCat'], mitigations: ['Data Backups','User Account Management','Privileged Account Management'], detection: 'Monitor for mass file renames with unusual extensions; volume shadow copy deletion.' },
  'T1566':     { technique_id: 'T1566',     name: 'Phishing',                           tactic: 'Initial Access',    tactic_id: 'TA0001', platforms: ['Windows','Linux','macOS','SaaS'], groups: ['APT28','APT29','Lazarus Group','TA505'], tools: [], mitigations: ['Anti-Phishing','User Training','Email Filtering'], detection: 'Email gateway scanning; sandbox detonation; link analysis.' },
  'T1566.001': { technique_id: 'T1566.001', name: 'Spearphishing Attachment',           tactic: 'Initial Access',    tactic_id: 'TA0001', platforms: ['Windows','Linux','macOS'], groups: ['APT28','APT29','Lazarus Group'], tools: [], mitigations: ['Anti-Phishing','Sandboxing','User Training'], detection: 'Email gateway with attachment sandboxing; macro execution alerts.' },
  'T1055':     { technique_id: 'T1055',     name: 'Process Injection',                  tactic: 'Defense Evasion',   tactic_id: 'TA0005', platforms: ['Windows','Linux'], groups: ['APT29','Lazarus Group','FIN7'], tools: ['Metasploit','Cobalt Strike'], mitigations: ['Privileged Account Management','Behavior Prevention on Endpoint'], detection: 'Monitor for process memory writes from unexpected parent processes.' },
  'T1021':     { technique_id: 'T1021',     name: 'Remote Services',                    tactic: 'Lateral Movement',  tactic_id: 'TA0008', platforms: ['Windows','Linux','macOS'], groups: ['APT41','Lazarus Group','FIN6'], tools: ['PsExec','RDP','SSH'], mitigations: ['Multi-Factor Authentication','Network Segmentation','Privileged Account Management'], detection: 'Alert on unusual RDP/SSH lateral movement; admin share access.' },
};

function search_mitre_attack(query: string): Record<string, unknown> {
  const q = query.trim().toUpperCase();

  // Direct ID match (T1003.001 or T1003)
  if (MITRE_DB[q]) return { ...MITRE_DB[q], matched_by: 'technique_id' };

  // Prefix match (T1003 → T1003.*)
  const prefix = Object.keys(MITRE_DB).find((k) => q.startsWith(k) || k.startsWith(q));
  if (prefix) return { ...MITRE_DB[prefix], matched_by: 'prefix' };

  // Keyword search in name
  const lower = query.toLowerCase();
  const nameMatch = Object.values(MITRE_DB).find((t) =>
    String(t.name).toLowerCase().includes(lower)
  );
  if (nameMatch) return { ...nameMatch, matched_by: 'name_search' };

  // Fallback
  return {
    query,
    matched_by: 'none',
    note: 'Technique not found in local ATT&CK index. Recommend checking https://attack.mitre.org',
    related_tactics: ['Credential Access', 'Execution', 'Lateral Movement', 'Command and Control'],
  };
}

function lookup_domain_reputation(domain: string): Record<string, unknown> {
  const score = deterministicInt(domain, 100);

  // Entropy check: random-looking domains → suspicious
  const isHighEntropy = /[0-9]{3,}/.test(domain) || domain.split('.')[0].length > 20;
  const effectiveScore = isHighEntropy ? Math.max(score, 75) : score;
  const malicious = effectiveScore >= 65;

  const TLDS = ['.xyz', '.top', '.ru', '.cn', '.io', '.me', '.biz', '.cc'];
  const isSuspiciousTLD = TLDS.some((t) => domain.endsWith(t));

  const REGISTRARS = ['Namecheap, Inc.', 'GoDaddy LLC', 'Tucows Domains', 'PDR Ltd.', 'Njalla', 'Key-Systems GmbH'];

  return {
    domain,
    verdict: malicious ? 'malicious' : effectiveScore >= 40 ? 'suspicious' : 'clean',
    threat_score: effectiveScore,
    categories: malicious ? ['command-and-control', 'malware'] : isSuspiciousTLD ? ['suspicious-tld'] : ['clean'],
    registrar: REGISTRARS[deterministicInt(domain + 'reg', REGISTRARS.length)],
    creation_date: malicious ? daysAgo(deterministicInt(domain + 'cd', 30)) : daysAgo(365 + deterministicInt(domain + 'cd', 1000)),
    recently_registered: malicious && deterministicInt(domain + 'rr', 2) === 0,
    ip_addresses: [`${deterministicInt(domain + 'ip1', 256)}.${deterministicInt(domain + 'ip2', 256)}.${deterministicInt(domain + 'ip3', 256)}.${deterministicInt(domain + 'ip4', 256)}`],
    tags: malicious
      ? ['c2', 'malware-distribution', 'recently-registered'].slice(0, 1 + deterministicInt(domain + 'tags', 3))
      : isSuspiciousTLD ? ['suspicious-tld'] : ['clean'],
    reports_count: malicious ? 10 + deterministicInt(domain + 'rc', 80) : 0,
    threat_feeds: malicious ? ['Spamhaus DBL', 'SURBL', 'Proofpoint ET'] : [],
  };
}

function get_asset_risk_profile(asset_identifier: string, asset_type: string): Record<string, unknown> {
  const score = deterministicInt(asset_identifier, 100);

  const riskLevel = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';

  const HOST_TAGS = ['domain-controller', 'privileged-system', 'internet-facing', 'jump-server', 'developer-workstation', 'endpoint'];
  const USER_TAGS = ['privileged-account', 'service-account', 'admin', 'contractor', 'offboarding', 'vip'];

  const tags = asset_type === 'host'
    ? [HOST_TAGS[deterministicInt(asset_identifier + 'tag', HOST_TAGS.length)]]
    : asset_type === 'user'
    ? [USER_TAGS[deterministicInt(asset_identifier + 'tag', USER_TAGS.length)]]
    : ['standard'];

  return {
    asset_identifier,
    asset_type,
    risk_score: score,
    risk_level: riskLevel,
    recent_alerts_30d: deterministicInt(asset_identifier + 'alerts', 30),
    open_incidents: deterministicInt(asset_identifier + 'inc', 3),
    vulnerabilities_critical: deterministicInt(asset_identifier + 'vuln', 6),
    last_security_event: daysAgo(deterministicInt(asset_identifier + 'lse', 10)),
    last_seen: today(),
    tags,
    os: asset_type === 'host'
      ? ['Windows Server 2022', 'Windows 11 Pro', 'Ubuntu 22.04 LTS', 'RHEL 9'][deterministicInt(asset_identifier + 'os', 4)]
      : null,
    privilege_level: asset_type === 'user'
      ? ['admin', 'elevated', 'standard'][deterministicInt(asset_identifier + 'priv', 3)]
      : null,
    department: ['IT Infrastructure', 'Finance', 'Engineering', 'HR', 'Executive', 'Sales'][deterministicInt(asset_identifier + 'dept', 6)],
  };
}

/* ── Tool dispatcher ─────────────────────────────────────────────── */

export function executeTool(name: string, input: Record<string, string>): Record<string, unknown> {
  try {
    switch (name) {
      case 'lookup_ip_reputation':
        return lookup_ip_reputation(input.ip ?? '');
      case 'lookup_file_hash':
        return lookup_file_hash(input.hash ?? '');
      case 'search_mitre_attack':
        return search_mitre_attack(input.query ?? '');
      case 'lookup_domain_reputation':
        return lookup_domain_reputation(input.domain ?? '');
      case 'get_asset_risk_profile':
        return get_asset_risk_profile(input.asset_identifier ?? '', input.asset_type ?? 'host');
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: `Tool execution failed: ${String(err)}` };
  }
}
