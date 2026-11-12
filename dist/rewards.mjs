import { animate } from "./motion.mjs?v=2.6.1";
/** Rewards UI: API results are authoritative. Animation never chooses an outcome. */
export function mountRewards({ data, canOpen }) {
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const panel = document.createElement("dialog");
  panel.id = "rewardsDialog";
  panel.setAttribute("aria-label", "Packs and rewards");
  document.body.append(panel);
  let snapshot,
    fight,
    working = false,
    error = "",
    revealed = null;
  const api = async (path, body) => {
    const r = await fetch(
      `/api/${path}`,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    if (!r.headers.get("content-type")?.includes("application/json"))
      throw Error(
        "Rewards require the local game server. Run npm start from the repository.",
      );
    const b = await r.json();
    if (!r.ok) throw Error(b.error || "Rewards service unavailable");
    return b;
  };
  const refresh = async () => {
    snapshot = await api("rewards");
    // Resume a challenge that is still running on the server (e.g. after a reload).
    if (!fight && snapshot.fight) fight = snapshot.fight;
  };
  const name = (p) => esc(data().pokemon[p.id].name);
  const sprite = (p, back = false) =>
    `assets/sprites/${p.id}${back ? "b" : ""}.png`;
  function render() {
    const s = snapshot;
    panel.setAttribute("aria-busy", String(working));
    panel.innerHTML = `<div class="reward-heading"><div><div class="eyebrow">COLLECTOR CRYPT REWARDS</div><h2>Packs & possibilities</h2></div><button data-r="close" aria-label="Close rewards">×</button></div>
      <p class="reward-mode">SANDBOX · ${s?.provider === "collector-crypt-development" ? "Collector Crypt development network" : "Simulated cards"}. No real assets or monetary value.</p>
      ${error ? `<p role="alert">${esc(error)}</p>` : ""}
      ${
        !s
          ? "<p>Connecting to the rewards service…</p>"
          : `
      <div class="reward-summary"><b>✧ ${s.shards} shards</b><span>${s.dailyUsed} / ${s.dailyLimit} packs earned today · resets 00:00 UTC</span></div>
      ${fight ? renderFight() : `<section class="reward-section"><h3>Guardian challenge · ${esc(s.tier.name)}</h3><p>A separate server-run battle with a supplied team. Earn a pack by defeating all three guardians. Your adventure team stays in your story.</p>${ladder(s)}<label>Challenge partner <select id="rewardStarter"><option value="1">Venusaur</option><option value="4">Charizard</option><option value="7">Blastoise</option></select></label><button data-r="challenge" class="primary" ${s.dailyUsed >= s.dailyLimit ? "disabled" : ""}>Challenge the guardians →</button></section>`}
      <section class="reward-section"><h3>Your packs</h3><p>Each pack grants either shards or a card entitlement. Odds are fixed when earned.</p><div class="reward-packs">${s.packs.length ? s.packs.map((p) => `<article class="reward-pack ${esc(p.tier)}"><span>✦</span><h3>${esc(tierName(s, p.tier))} pack</h3><small>${pct(p.odds)} card · otherwise ${p.shards} shards<br>${p.funding && p.base_bps ? `base ${pct(p.base_bps)} × bank ${Number(p.funding.multiplier).toFixed(2)} · ` : ""}${esc(p.config)}</small><button data-r="open" data-id="${p.id}">${p.result ? "View saved result" : "Rip open pack"}</button></article>`).join("") : "<p>Defeat a guardian challenge to earn your first pack.</p>"}</div></section>
      ${revealed ? `<section class="pack-reveal" role="status"><b>${revealed.kind === "shards" ? `✧ ${revealed.amount} shards` : "✦ Card entitlement earned!"}</b><p>${revealed.kind === "shards" ? "Saved to your reward account." : "Your card claim is saved below. Claim or retry whenever you are ready."}</p></section>` : ""}
      <section class="reward-section"><h3>Shard exchange</h3><p>${s.redemptionShards} shards → one random card from the configured reward pool. Sandbox pool is simulated; individual cards cannot be selected.</p><button data-r="redeem" class="primary" ${s.shards < s.redemptionShards ? "disabled" : ""}>Redeem ${s.redemptionShards} shards</button></section>
      <section class="reward-section"><h3>Card claims</h3>${s.jobs.length ? s.jobs.map((j) => `<div class="reward-claim"><b>${j.status === "fulfilled" ? esc(j.result.cardName) : "Card entitlement · pending"}</b><small>${j.result ? esc(j.result.custody) : "Saved claim — retries keep the same reference"}</small>${j.error ? `<p>${esc(j.error)}</p>` : ""}${j.status !== "fulfilled" ? `<button data-r="claim" data-id="${j.id}">Claim / retry</button>` : ""}</div>`).join("") : "<p>Direct card wins and shard redemptions appear here.</p>"}</section>`
      }`;
    panel.querySelectorAll("button").forEach((b) => {
      if (working) b.disabled = true;
    });
  }
  const pct = (bps) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
  const tierName = (s, id) => s.ladder?.find((t) => t.id === id)?.name || id;
  function ladder(s) {
    const tiers = s.ladder || [],
      rank = tiers.findIndex((t) => t.id === s.tier.id) + 1,
      next = s.nextTier,
      from = s.tier.wins,
      progress = next
        ? Math.min(100, ((s.wins - from) / (next.wins - from)) * 100)
        : 100,
      o = s.nextOdds;
    return `<div class="reward-ladder"><p><b>Rank ${rank} of ${tiers.length}</b> · ${s.wins} guardian win${s.wins === 1 ? "" : "s"}</p>
      <div class="ladder-track" role="progressbar" aria-label="Progress to the next tier" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><i style="width:${progress}%"></i></div>
      <p>${next ? `${next.wins - s.wins} more win${next.wins - s.wins === 1 ? "" : "s"} to reach <b>${esc(next.name)}</b> (base ${pct(next.cardBps)} card, ${next.shards} shards).` : "Top tier reached. Every pack now uses the best base odds."}</p>
      ${o ? `<p class="ladder-odds">Your next pack: <b>${pct(o.bps)} card chance</b> · base ${pct(o.baseBps)} × bank ${Number(o.multiplier).toFixed(2)}${o.reserveRatio !== null ? ` <small>(reserve ${Number(o.reserveRatio).toFixed(2)}, recent fees ${Number(o.feeRatio).toFixed(2)})</small>` : ""}. Locked in when you win.</p>` : ""}</div>`;
  }
  function renderFight() {
    const b = fight.battle,
      p = b.party[b.pi],
      e = b.enemies[b.ei];
    return `<section class="reward-section" data-turn="${fight.sequence}"><h3>${esc(fight.tier.name)} Guardian · Lv. ${p.level}</h3><div class="reward-battle"><div><img src="${sprite(p, true)}" alt="${name(p)}"><b>${name(p)}</b><span>${p.hp}/${p.maxHp} HP ${esc(p.status || "")}</span></div><div><img src="${sprite(e)}" alt="${name(e)}"><b>${name(e)}</b><span>${e.hp}/${e.maxHp} HP ${esc(e.status || "")}</span></div></div><div role="log">${b.logs.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
      ${b.outcome ? `<p><b>${b.outcome === "won" ? "Victory! Your pack is saved." : "Defeat. Try a new strategy."}</b></p>` : `<div class="reward-actions">${p.moves.map((m, i) => `<button data-r="move" data-index="${i}">${esc(data().moves[m.id].name)} · ${m.pp} PP</button>`).join("")}<button data-r="potion">Potion (${fight.bag.potion})</button>${b.party.map((q, i) => `<button data-r="switch" data-index="${i}" ${q.hp <= 0 || i === b.pi ? "disabled" : ""}>Switch: ${name(q)} · ${q.hp} HP</button>`).join("")}</div>`}<button data-r="leave">${b.outcome ? "Return to rewards" : "Leave challenge"}</button></section>`;
  }
  panel.addEventListener("click", async (e) => {
    const button = e.target.closest("[data-r]");
    if (!button || working) return;
    const a = button.dataset.r;
    if (a === "close") {
      await animate(panel, [{ opacity: 1 }, { opacity: 0 }], 100);
      panel.close();
      return;
    }
    const starter = Number(panel.querySelector("#rewardStarter")?.value || 1);
    working = true;
    error = "";
    render();
    try {
      if (a === "challenge") fight = await api("challenges/start", { starter });
      if (["move", "switch", "potion"].includes(a))
        fight = await api("challenges/action", {
          id: fight.id,
          sequence: fight.sequence,
          action: { type: a, index: Number(button.dataset.index || 0) },
        });
      if (a === "leave") {
        await api("challenges/leave", {});
        fight = null;
      }
      if (a === "open") {
        revealed = await api("packs/open", { id: button.dataset.id });
        panel.classList.remove("ripping");
        void panel.offsetWidth;
        panel.classList.add("ripping");
        await api("packs/reveal", { id: button.dataset.id });
      }
      if (a === "redeem") {
        // Persist until acknowledged, so a network timeout cannot spend a second redemption.
        let key =
          localStorage.getItem("kanto-redemption-request") ||
          crypto.randomUUID();
        localStorage.setItem("kanto-redemption-request", key);
        await api("redeem", { key });
        localStorage.removeItem("kanto-redemption-request");
      }
      if (a === "claim") await api("fulfill", { id: button.dataset.id });
      await refresh();
    } catch (e) {
      error = e.message;
    } finally {
      working = false;
      render();
      if (["challenge", "leave", "move", "switch", "potion"].includes(a))
        void animate(
          panel.querySelector(".reward-battle"),
          [{ opacity: 0.65 }, { opacity: 1 }],
          140,
        );
    }
  });
  document.querySelector("#rewardsBtn").addEventListener("click", async () => {
    if (!canOpen()) return;
    error = "";
    panel.showModal();
    render();
    void animate(
      panel,
      [
        { opacity: 0, transform: "translateY(7px)" },
        { opacity: 1, transform: "none" },
      ],
      150,
    );
    try {
      await refresh();
    } catch (e) {
      error = e.message;
    }
    render();
  });
}
