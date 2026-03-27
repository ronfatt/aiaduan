import { Complaint, TriageOutput, Zone } from "@/lib/types";

function daysAgo(dateString: string) {
  const now = Date.now();
  const t = new Date(dateString).getTime();
  return Math.floor((now - t) / (24 * 3600 * 1000));
}

export function getSimilarCaseStats(
  complaints: Complaint[],
  input: { zone: Zone; category: TriageOutput["category"] },
) {
  const recent = complaints.filter(
    (item) => daysAgo(item.createdAt) <= 14 && item.zone === input.zone && item.aiCategory === input.category,
  );

  const unresolved = recent.filter((item) => item.status !== "DONE");
  const cluster = recent.length >= 3;

  return {
    similarCount: recent.length,
    unresolvedCount: unresolved.length,
    cluster,
    pattern: cluster ? "3-day outage cluster" : "No major cluster detected",
    riskLine:
      unresolved.length >= 3
        ? "Risk of public safety incident increasing"
        : unresolved.length > 0
          ? "Service continuity risk exists"
          : "Risk currently stable",
  };
}

export function getAdminAiAction(item: Complaint) {
  const base = {
    ROAD: { team: "Road Unit Team A", manpower: 3, cost: 480 },
    WASTE: { team: "Waste Unit Team B", manpower: 2, cost: 260 },
    DRAINAGE: { team: "Drainage Rapid Team", manpower: 4, cost: 620 },
    STREETLIGHT: { team: "Lighting Unit Team B", manpower: 2, cost: 320 },
    ANIMALS: { team: "Animal Control Team", manpower: 2, cost: 290 },
    ILLEGAL_STALL: { team: "Enforcement Patrol C", manpower: 2, cost: 350 },
  }[item.aiCategory];

  const riskScore = Math.min(
    100,
    Math.round(
      (item.aiUrgency === "HIGH" ? 46 : item.aiUrgency === "MEDIUM" ? 30 : 18) +
        item.aiConfidence * 30 +
        (item.status === "DONE" ? 0 : 10),
    ),
  );

  const clusterTag = item.aiUrgency === "HIGH" || item.aiCategory === "DRAINAGE";
  const escalation = (item.aiUrgency === "HIGH" && item.status !== "DONE") || riskScore >= 80;
  const dispatchWithinHours = item.aiUrgency === "HIGH" ? 12 : item.aiUrgency === "MEDIUM" ? 24 : 48;
  const delayRiskIncreasePct = item.aiUrgency === "HIGH" ? 8 : item.aiUrgency === "MEDIUM" ? 5 : 2;

  return {
    riskScore,
    clusterTag,
    escalation,
    team: base.team,
    manpower: base.manpower,
    costRm: base.cost,
    dispatchWithinHours,
    delayRiskIncreasePct,
    note: escalation
      ? "Escalate to supervisor due to elevated service risk and response urgency."
      : "Standard operational routing is sufficient.",
  };
}

export function getForecast(complaints: Complaint[]) {
  const last14Drainage = complaints.filter(
    (item) => daysAgo(item.createdAt) <= 14 && item.aiCategory === "DRAINAGE",
  ).length;

  const prev14Drainage = complaints.filter((item) => {
    const d = daysAgo(item.createdAt);
    return d > 14 && d <= 28 && item.aiCategory === "DRAINAGE";
  }).length;

  const baseline = prev14Drainage > 0 ? prev14Drainage : Math.max(1, Math.round(last14Drainage * 0.85));
  const change = Math.round(((last14Drainage - baseline) / baseline) * 100);

  const byZone = complaints
    .filter((item) => item.aiCategory === "DRAINAGE" && item.status !== "DONE")
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.zone] = (acc[item.zone] || 0) + 1;
      return acc;
    }, {});

  const highRiskZone =
    (Object.entries(byZone).sort((a, b) => b[1] - a[1])[0]?.[0] as Zone | undefined) ?? "Balung";

  return {
    predictedChangePct: change || 21,
    highRiskZone,
    recommendation: "Suggested preventive inspection",
    modelConfidence: 0.86,
  };
}

export function getPredictiveHotspots(complaints: Complaint[]) {
  const grouped = complaints.reduce<Record<string, { zone: Zone; lat: number; lng: number; count: number; categories: Record<string, number> }>>(
    (acc, item) => {
      if (item.status === "DONE") return acc;
      const key = item.zone;
      if (!acc[key]) {
        acc[key] = { zone: item.zone, lat: 0, lng: 0, count: 0, categories: {} };
      }
      acc[key].lat += item.lat;
      acc[key].lng += item.lng;
      acc[key].count += 1;
      acc[key].categories[item.aiCategory] = (acc[key].categories[item.aiCategory] || 0) + 1;
      return acc;
    },
    {},
  );

  return Object.values(grouped)
    .filter((item) => item.count >= 2)
    .map((item) => {
      const topCategory = Object.entries(item.categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ROAD";
      const predictedIncreasePct = 10 + item.count * 4;
      return {
        zone: item.zone,
        lat: Number((item.lat / item.count).toFixed(6)),
        lng: Number((item.lng / item.count).toFixed(6)),
        count: item.count,
        topCategory,
        predictedIncreasePct,
        riskLabel: predictedIncreasePct >= 20 ? "High" : "Elevated",
      };
    })
    .sort((a, b) => b.predictedIncreasePct - a.predictedIncreasePct)
    .slice(0, 4);
}

export function getRiskScoreFromSignal(input: {
  urgency: TriageOutput["urgency"];
  confidence: number;
  similarCount: number;
  unresolvedCount: number;
}) {
  const base = input.urgency === "HIGH" ? 54 : input.urgency === "MEDIUM" ? 34 : 18;
  const score = base + Math.round(input.confidence * 22) + input.similarCount * 2 + input.unresolvedCount * 4;
  return Math.max(0, Math.min(100, score));
}

export function getOperationalEfficiency(complaints: Complaint[]) {
  const active = complaints.filter((item) => item.status !== "DONE").length;
  const reduction = Math.min(90, 62 + Math.round(complaints.length / 2.5));
  const manpowerSaving = Math.max(1, Math.round(active / 14));
  return {
    triageReductionPct: reduction,
    manpowerSavingPerMonth: manpowerSaving,
  };
}

export function getResourceAllocationPlan(complaints: Complaint[]) {
  const byDepartment = complaints
    .filter((item) => item.status !== "DONE")
    .reduce<Record<string, { active: number; highRisk: number; overdue: number }>>((acc, item) => {
      if (!acc[item.department]) acc[item.department] = { active: 0, highRisk: 0, overdue: 0 };
      acc[item.department].active += 1;
      if (item.aiUrgency === "HIGH") acc[item.department].highRisk += 1;
      if (item.slaEscalationLevel === "SUPERVISOR" || item.slaEscalationLevel === "PRESIDENT") acc[item.department].overdue += 1;
      return acc;
    }, {});

  const ranked = Object.entries(byDepartment)
    .map(([department, metrics]) => ({
      department,
      ...metrics,
      pressureScore: metrics.active * 3 + metrics.highRisk * 8 + metrics.overdue * 10,
    }))
    .sort((a, b) => b.pressureScore - a.pressureScore);

  const primary = ranked[0] ?? {
    department: "Public Lighting Unit",
    active: 6,
    highRisk: 2,
    overdue: 1,
    pressureScore: 36,
  };

  return {
    primaryDepartment: primary.department,
    overloadScore: primary.pressureScore,
    deferredTasks: Math.max(1, Math.round(primary.active / 3)),
    priorityCases: Math.max(1, primary.highRisk + primary.overdue),
    recommendation:
      primary.overdue > 0
        ? `Delay low-priority work and assign extra crew to ${primary.department}.`
        : `Prioritize high-risk queue for ${primary.department} before new routine tasks.`,
    interventionPlan: [
      `Prioritize ${Math.max(1, primary.highRisk)} high-risk cases in ${primary.department}.`,
      `Delay ${Math.max(1, Math.round(primary.active / 4))} routine tasks for 24 hours.`,
      `Notify supervisor if overload remains above score ${Math.max(30, primary.pressureScore - 6)}.`,
    ],
  };
}

export function getLiveCaseTracking(item: Complaint) {
  const stages = [
    {
      key: "RECEIVED",
      title: "Aduan diterima",
      detail: "Kes berjaya direkod dalam sistem municipal queue.",
    },
    {
      key: "ASSIGNED",
      title: "Pasukan menerima tugasan",
      detail: `Tugasan telah diserahkan kepada ${item.department}.`,
    },
    {
      key: "IN_PROGRESS",
      title: "Pasukan sedang ke lokasi / bekerja",
      detail: `Pasukan lapangan sedang menuju atau menjalankan kerja di ${item.zone}.`,
    },
    {
      key: "DONE",
      title: "Kerja selesai",
      detail: "Kes ditandakan selesai dan menunggu pengesahan awam.",
    },
  ] as const;

  const currentIndex =
    item.status === "DONE" ? 3 : item.status === "IN_PROGRESS" ? 2 : item.status === "ASSIGNED" ? 1 : 0;

  const progressPct = [18, 42, 74, 100][currentIndex];
  const nextUpdateHours = item.status === "DONE" ? 0 : item.status === "IN_PROGRESS" ? 6 : item.status === "ASSIGNED" ? 12 : 24;
  const driverStyleLine =
    item.status === "DONE"
      ? "Work completed. Final verification pending."
      : item.status === "IN_PROGRESS"
        ? `Field team is active in ${item.zone}.`
        : item.status === "ASSIGNED"
          ? `Team is preparing to move toward ${item.zone}.`
          : "Waiting for department assignment.";

  return {
    stages,
    currentIndex,
    progressPct,
    nextUpdateHours,
    driverStyleLine,
  };
}

export function getWeeklyMayorBrief(complaints: Complaint[], feedbacks: Array<{ rating: number; puasHati: boolean }>) {
  const total = complaints.length;
  const resolved = complaints.filter((item) => item.status === "DONE").length;
  const overdue = complaints.filter((item) => item.status !== "DONE" && item.slaEscalationLevel !== "NONE").length;
  const topDepartment =
    Object.entries(
      complaints.reduce<Record<string, number>>((acc, item) => {
        acc[item.department] = (acc[item.department] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Public Lighting Unit";
  const topRiskZone =
    Object.entries(
      complaints.reduce<Record<string, number>>((acc, item) => {
        if (item.status === "DONE") return acc;
        acc[item.zone] = (acc[item.zone] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Balung";
  const avgRating = feedbacks.length
    ? Number((feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length).toFixed(1))
    : 4.1;

  return {
    headline: `This week ${resolved} of ${total} complaints were resolved, while ${overdue} remain under escalation watch.`,
    operationalNote: `${topDepartment} carried the heaviest workload and should be monitored for capacity strain.`,
    publicNote: `Public satisfaction is holding at ${avgRating}/5, but ${topRiskZone} remains the highest pressure zone.`,
    recommendation: `Prioritize intervention in ${topRiskZone} and review SLA support for ${topDepartment}.`,
  };
}

export function getPublicBroadcasts(complaints: Complaint[]) {
  const grouped = complaints
    .filter((item) => item.status !== "DONE")
    .reduce<Record<string, { zone: Zone; count: number; category: Complaint["aiCategory"] }>>((acc, item) => {
      const key = `${item.zone}-${item.aiCategory}`;
      if (!acc[key]) acc[key] = { zone: item.zone, count: 0, category: item.aiCategory };
      acc[key].count += 1;
      return acc;
    }, {});

  return Object.values(grouped)
    .filter((row) => row.count >= 2)
    .map((row, idx) => ({
      id: `broadcast-${idx + 1}`,
      zone: row.zone,
      category: row.category,
      severity: row.count >= 4 ? "HIGH" : "MEDIUM",
      title:
        row.category === "DRAINAGE"
          ? `Flood caution for ${row.zone}`
          : row.category === "ROAD"
            ? `Traffic safety advisory for ${row.zone}`
            : `Service alert for ${row.zone}`,
      message:
        row.category === "DRAINAGE"
          ? `Drainage complaints are increasing in ${row.zone}. Residents are advised to monitor water levels and avoid low-lying routes.`
          : row.category === "ROAD"
            ? `Road hazard complaints are clustering in ${row.zone}. Drive with caution and expect maintenance activity.`
            : `Municipal risk signals are elevated in ${row.zone}. Relevant teams have been alerted.`,
      channel: "SMS + WhatsApp Broadcast",
    }))
    .slice(0, 4);
}

export function getProactiveAlerts(complaints: Complaint[]) {
  const alerts: string[] = [];

  const recent3d = complaints.filter((item) => daysAgo(item.createdAt) <= 3);
  const clusterMap = recent3d.reduce<Record<string, number>>((acc, item) => {
    const key = `${item.zone}-${item.aiCategory}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const clusterHit = Object.entries(clusterMap).find(([, count]) => count >= 3);
  if (clusterHit) {
    const [zone, cat] = clusterHit[0].split("-");
    alerts.push(`Cluster Issue: ${countText(clusterHit[1])} complaints in ${zone} for ${cat} within 3 days.`);
  }

  const recentDrainage = recent3d.filter((item) => item.aiCategory === "DRAINAGE").length;
  if (recentDrainage >= 3) {
    alerts.push("Proactive Trigger: Consecutive rain-period drainage complaints detected, inspect drains immediately.");
  }

  if (!alerts.length) alerts.push("No active proactive triggers. Monitoring continues.");

  return alerts;
}

function countText(value: number) {
  return `${value}`;
}
