const config = window.ONCHAIN_KITTY_CONFIG || {
  xHandle: "@Onchain_Kitty",
  xProfileUrl: "https://x.com/Onchain_Kitty",
  xPostUrl: "https://x.com/Onchain_Kitty/status/2090426837277257784",
  xPostId: "2090426837277257784",
  campaignImages: ["/assets/onchain-kitty.jpg"],
  shareText: "Now I'm super bullish on @Onchain_Kitty."
};

const TASK_STORAGE_KEY = "onchain-kitty-wl-tasks-v1";
const SUBMISSION_STORAGE_KEY = "onchain-kitty-wl-submission-v1";
const validRoutes = new Set(["home", "game", "about", "terms", "privacy"]);

function campaignPostId() {
  const configuredId = String(config.xPostId || "").trim();
  if (/^\d+$/.test(configuredId)) return configuredId;
  return String(config.xPostUrl || "").match(/\/status\/(\d+)/)?.[1] || "";
}

function xIntentUrl(action) {
  const screenName = String(config.xHandle || "Onchain_Kitty").replace(/^@/, "");
  const postId = campaignPostId();

  if (action === "follow") {
    return `https://twitter.com/intent/follow?screen_name=${encodeURIComponent(screenName)}`;
  }

  if (!postId) return config.xPostUrl;

  const intentPaths = {
    like: "like",
    repost: "retweet",
    comment: "tweet"
  };
  const queryKey = action === "comment" ? "in_reply_to" : "tweet_id";
  return `https://twitter.com/intent/${intentPaths[action]}?${queryKey}=${encodeURIComponent(postId)}`;
}

const taskDefinitions = [
  {
    id: "follow",
    number: "01",
    label: "Follow Onchain Kitty",
    description: `Follow ${config.xHandle} on X.`,
    action: "Follow on X",
    url: xIntentUrl("follow"),
    accent: "lime"
  },
  {
    id: "like",
    number: "02",
    label: "Like the X Post",
    description: "Show the campaign post some onchain love.",
    action: "Like on X",
    url: xIntentUrl("like"),
    accent: "pink"
  },
  {
    id: "repost",
    number: "03",
    label: "Repost the X Post",
    description: "Send the Kitty signal across the timeline.",
    action: "Repost on X",
    url: xIntentUrl("repost"),
    accent: "violet"
  },
  {
    id: "comment",
    number: "04",
    label: "Comment on the Post",
    description: "Tell the timeline why you are bullish.",
    action: "Comment on X",
    url: xIntentUrl("comment"),
    accent: "orange"
  }
];

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function defaultTaskState() {
  return Object.fromEntries(taskDefinitions.map((task) => [task.id, {
    opened: false,
    complete: false
  }]));
}

const state = {
  tasks: { ...defaultTaskState(), ...readStoredJson(TASK_STORAGE_KEY, {}) },
  submission: readStoredJson(SUBMISSION_STORAGE_KEY, null),
  submitting: false
};

const routeView = document.querySelector("#route-view");
const toast = document.querySelector("[data-toast]");
let toastTimer;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRoute() {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0] || "home";
  return validRoutes.has(route) ? route : "home";
}

function completedTaskCount() {
  return taskDefinitions.filter((task) => state.tasks[task.id]?.complete).length;
}

function allTasksComplete() {
  return completedTaskCount() === taskDefinitions.length;
}

function saveTaskState() {
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(state.tasks));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("toast--visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("toast--visible"), 3200);
}

function taskCardTemplate(task) {
  const taskState = state.tasks[task.id] || { opened: false, complete: false };
  const buttonLabel = taskState.complete
    ? "Completed"
    : taskState.opened
      ? "Mark completed"
      : task.action;
  const statusLabel = taskState.complete
    ? "TASK COMPLETE"
    : taskState.opened
      ? "ACTION OPENED"
      : "READY";

  return `
    <article class="task-card task-card--${task.accent} ${taskState.complete ? "task-card--complete" : ""} reveal" data-task-card="${task.id}">
      <div class="task-card__topline">
        <span class="task-number">${task.number}</span>
        <span class="task-status">
          <span class="task-status__dot" aria-hidden="true"></span>
          ${statusLabel}
        </span>
      </div>
      <div class="task-card__copy">
        <h3>${task.label}</h3>
        <p>${task.description}</p>
      </div>
      <button
        class="max-button task-action"
        type="button"
        data-task-action="${task.id}"
        ${taskState.complete ? "disabled" : ""}
        aria-label="${buttonLabel}: ${task.label}"
      >
        <span>${buttonLabel}</span>
        <span class="button-arrow" aria-hidden="true">${taskState.complete ? "✓" : "↗"}</span>
      </button>
      <span class="task-sticker" aria-hidden="true">${taskState.complete ? "DONE!" : "DO IT"}</span>
    </article>
  `;
}

function heroTemplate() {
  return `
    <section class="hero page-shell" aria-labelledby="hero-title">
      <div class="hero__copy reveal">
        <div class="hero-kicker">
          <span class="live-dot" aria-hidden="true"></span>
          THE CAT IS ONLINE
        </div>
        <h1 id="hero-title" class="hero-title">
          <span>ONCHAIN</span>
          <span class="hero-title__kitty">KITTY</span>
        </h1>
        <p class="hero-deck">A pixel identity entering its next life — onchain, playable, and built to keep evolving.</p>
        <div class="hero-actions">
          <a class="max-button max-button--dark" href="#wl-application">
            <span>APPLY FOR WL</span>
            <span class="button-arrow" aria-hidden="true">↓</span>
          </a>
          <a class="text-link" href="#/about">SEE THE EVOLUTION <span aria-hidden="true">↗</span></a>
        </div>
        <div class="hero-microcopy">
          <span>NFT CULTURE</span>
          <span>PIXEL IDENTITY</span>
          <span>GAME ENERGY</span>
        </div>
      </div>

      <div class="hero__visual reveal">
        <div class="kitty-orbit" aria-hidden="true"></div>
        <div class="kitty-frame">
          <div class="kitty-frame__label">OFFICIAL KITTY // 001</div>
          <img
            class="kitty-art"
            src="/assets/onchain-kitty.jpg"
            alt="Official pixel Onchain Kitty character"
            width="1536"
            height="1536"
            fetchpriority="high"
          />
          <div class="kitty-frame__footer">
            <span>STATUS: CURIOUS</span>
            <span>CHAIN: ROBINHOOD</span>
          </div>
        </div>
        <div class="round-sticker round-sticker--top" aria-hidden="true">100%<br />ONCHAIN<br />ENERGY</div>
        <div class="pixel-sticker pixel-sticker--bottom" aria-hidden="true">9 LIVES<br />∞ IDEAS</div>
        <span class="hero-spark hero-spark--one" aria-hidden="true">✦</span>
        <span class="hero-spark hero-spark--two" aria-hidden="true">✦</span>
      </div>
    </section>

    <div class="marquee-strip marquee-strip--black" aria-label="Onchain Kitty values">
      <div class="marquee-track">
        <span>WHITELIST OPEN ★ ONCHAIN IDENTITY ★ KITTY UNIVERSE ★ BUILT TO EVOLVE ★</span>
        <span>WHITELIST OPEN ★ ONCHAIN IDENTITY ★ KITTY UNIVERSE ★ BUILT TO EVOLVE ★</span>
      </div>
    </div>
  `;
}

function successTemplate() {
  const image = state.submission?.image || config.campaignImages?.[0] || "/assets/onchain-kitty.jpg";
  const shareCopy = escapeHtml(config.shareText).replaceAll("\n", "<br />");

  return `
    <section class="success-state page-shell" id="wl-application" aria-labelledby="success-title">
      <div class="success-burst" aria-hidden="true">
        <span>★</span><span>★</span><span>★</span><span>★</span>
      </div>
      <div class="success-panel reveal">
        <div class="success-panel__copy">
          <span class="section-tag section-tag--lime">APPLICATION RECORDED</span>
          <h2 id="success-title">WL APPLICATION<br /><em>SUBMITTED</em></h2>
          <p>Your wallet is in. Now send the Kitty signal across X.</p>

          <blockquote class="share-copy">
            <span class="quote-mark" aria-hidden="true">«</span>${shareCopy}<span class="quote-mark" aria-hidden="true">»</span>
          </blockquote>

          <div class="success-actions">
            <button class="max-button max-button--lime" type="button" data-share-x>
              <span>SHARE ON X</span>
              <span class="button-arrow" aria-hidden="true">↗</span>
            </button>
            <button class="icon-button" type="button" data-copy-share aria-label="Copy share text">COPY TEXT</button>
          </div>
        </div>

        <figure class="campaign-image-card">
          <div class="campaign-image-card__top">
            <span>YOUR KITTY SIGNAL</span>
            <span>RANDOM DROP</span>
          </div>
          <img src="${escapeHtml(image)}" alt="Onchain Kitty campaign visual" width="1536" height="1536" loading="lazy" />
          <figcaption>One signal. Many possible Kitty drops.</figcaption>
        </figure>
      </div>
    </section>
  `;
}

function campaignPostTemplate() {
  const postId = campaignPostId();
  const postUrl = String(config.xPostUrl || "").trim();

  if (!postId || !postUrl) return "";

  const embedUrl = `https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${encodeURIComponent(postId)}&theme=dark`;

  return `
    <section class="campaign-post reveal" aria-labelledby="campaign-post-title">
      <div class="campaign-post__copy">
        <span class="section-tag section-tag--lime">CAMPAIGN POST // LIVE</span>
        <h3 id="campaign-post-title">THE KITTY<br /><em>SIGNAL</em></h3>
        <p>Use this official post for the Like, Repost, and Comment missions below.</p>
        <a
          class="max-button max-button--lime campaign-post__link"
          href="${escapeHtml(postUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>OPEN POST ON X</span>
          <span class="button-arrow" aria-hidden="true">↗</span>
        </a>
      </div>

      <div class="campaign-post__embed">
        <iframe
          src="${escapeHtml(embedUrl)}"
          title="Onchain Kitty campaign post on X"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
        <p class="campaign-post__fallback">
          X embed unavailable?
          <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer">Open the post directly.</a>
        </p>
      </div>
    </section>
  `;
}

function applicationTemplate() {
  const count = completedTaskCount();
  const eligible = allTasksComplete();
  const progress = Math.round((count / taskDefinitions.length) * 100);

  return `
    <section class="wl-section" id="wl-application" aria-labelledby="wl-title">
      <div class="page-shell">
        <div class="section-heading reveal">
          <div>
            <span class="section-tag">4 TASKS // 1 WALLET</span>
            <h2 id="wl-title">WL<br /><em>APPLICATION</em></h2>
          </div>
          <div class="section-heading__side">
            <p>Complete the four X missions. Confirm each one here. Then drop your EVM wallet.</p>
            <span class="honesty-note">Task completion is self-confirmed. X opens in a new tab.</span>
          </div>
        </div>

        ${campaignPostTemplate()}

        <div class="mission-progress reveal" aria-label="${count} of 4 tasks completed">
          <div class="mission-progress__copy">
            <span>MISSION PROGRESS</span>
            <strong>${count}/4</strong>
          </div>
          <div class="mission-progress__bar" aria-hidden="true">
            <span style="--progress: ${progress}%"></span>
          </div>
          <span class="mission-progress__state">${eligible ? "WALLET UNLOCKED" : "WALLET LOCKED"}</span>
        </div>

        <div class="task-grid">
          ${taskDefinitions.map(taskCardTemplate).join("")}
        </div>

        <div class="wallet-panel ${eligible ? "wallet-panel--unlocked" : "wallet-panel--locked"} reveal">
          <div class="wallet-panel__badge" aria-hidden="true">${eligible ? "UNLOCKED" : "LOCKED"}</div>
          <div class="wallet-panel__intro">
            <span class="section-tag section-tag--dark">FINAL CHECKPOINT</span>
            <h3>DROP YOUR<br />WALLET</h3>
            <p>${eligible
              ? "All missions confirmed. Enter the wallet you want considered for WL."
              : `Complete ${4 - count} more ${4 - count === 1 ? "mission" : "missions"} to unlock submission.`}</p>
          </div>

          <form class="wallet-form" data-wallet-form novalidate>
            <label for="x-username">X Username <span>Optional</span></label>
            <div class="input-shell">
              <span class="input-prefix">@</span>
              <input
                id="x-username"
                name="xUsername"
                type="text"
                autocomplete="off"
                inputmode="text"
                placeholder="yourusername"
                maxlength="30"
                ${eligible ? "" : "disabled"}
              />
            </div>

            <label for="wallet-address">EVM Wallet Address <span>Required</span></label>
            <div class="input-shell input-shell--wallet">
              <span class="input-prefix">0x</span>
              <input
                id="wallet-address"
                name="wallet"
                type="text"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
                inputmode="text"
                placeholder="0000...0000"
                minlength="42"
                maxlength="42"
                aria-describedby="wallet-help wallet-error"
                ${eligible ? "" : "disabled"}
                required
              />
            </div>
            <small id="wallet-help">A valid EVM address contains 0x followed by 40 hexadecimal characters.</small>
            <p class="form-message" id="wallet-error" data-form-message role="alert"></p>

            <button class="max-button max-button--submit" type="submit" ${eligible || state.submitting ? "" : "disabled"}>
              <span>${state.submitting ? "SUBMITTING..." : "SUBMIT APPLICATION"}</span>
              <span class="button-arrow" aria-hidden="true">${state.submitting ? "…" : "→"}</span>
            </button>
          </form>

          <div class="locked-overlay" aria-hidden="${eligible ? "true" : "false"}">
            <span class="pixel-lock">${eligible ? "✓" : "×"}</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function homeTemplate() {
  return `${heroTemplate()}${state.submission ? successTemplate() : applicationTemplate()}`;
}

function gameTemplate() {
  return `
    <section class="game-page page-shell" aria-labelledby="game-title">
      <div class="game-topline reveal">
        <span>ONCHAIN KITTY // GAME MODULE</span>
        <span class="not-live-pill"><span></span> NOT PLAYABLE YET</span>
      </div>

      <div class="game-stage">
        <div class="game-copy reveal">
          <span class="game-mini-label">PLAYER ONE, PLEASE WAIT</span>
          <h1 id="game-title">GAME</h1>
          <h2>UNDER<br /><em>CONSTRUCTION</em></h2>
          <p>Something playable is coming.</p>

          <div class="fake-loader" aria-label="Decorative development status, not a release progress estimate">
            <div class="fake-loader__label">
              <span>BUILDING THE PLAYGROUND</span>
              <span>LOADING IDEAS</span>
            </div>
            <div class="fake-loader__segments" aria-hidden="true">
              ${Array.from({ length: 12 }, (_, index) => `<span class="${index < 7 ? "is-lit" : ""}"></span>`).join("")}
            </div>
            <small>VISUAL HUD ONLY — NOT A RELEASE TIMELINE</small>
          </div>
        </div>

        <div class="game-visual reveal">
          <div class="game-window">
            <div class="game-window__bar">
              <span>CAT_CAM.EXE</span>
              <div><i></i><i></i><i></i></div>
            </div>
            <div class="game-window__screen">
              <img src="/assets/onchain-kitty.jpg" alt="Official Onchain Kitty character" width="1536" height="1536" />
            </div>
          </div>
          <div class="controller-card" aria-hidden="true">
            <span class="d-pad">+</span>
            <div><i>A</i><i>B</i></div>
            <strong>COMING<br />SOON</strong>
          </div>
        </div>
      </div>

      <div class="game-status-row reveal" aria-label="Decorative game concepts">
        <div><span>01</span><strong>PIXEL<br />MOVEMENT</strong><small>IN DEVELOPMENT</small></div>
        <div><span>02</span><strong>KITTY<br />WORLD</strong><small>IN DEVELOPMENT</small></div>
        <div><span>03</span><strong>ONCHAIN<br />IDENTITY</strong><small>IN DEVELOPMENT</small></div>
      </div>
    </section>
  `;
}

const evolutionStages = [
  {
    number: "01",
    title: "NFTs",
    subtitle: "THE FIRST LIFE",
    description: "Your Kitty begins onchain.",
    className: "lime",
    icon: "◆"
  },
  {
    number: "02",
    title: "Stake",
    subtitle: "TAKE YOUR POSITION",
    description: "Future staking mechanics will add new ways for holders to participate.",
    className: "pink",
    icon: "⊕"
  },
  {
    number: "03",
    title: "Game",
    subtitle: "ENTER THE WORLD",
    description: "Onchain Kitty will evolve into an interactive playable experience.",
    className: "violet",
    icon: "✣"
  },
  {
    number: "04",
    title: "Earn",
    subtitle: "PARTICIPATION MATTERS",
    description: "Participation in the ecosystem may unlock future earning mechanics and rewards.",
    className: "orange",
    icon: "✦"
  },
  {
    number: "05",
    title: "More",
    subtitle: "THE NEXT NINE LIVES",
    description: "The ecosystem will continue expanding with new experiences, utilities, and community-driven features.",
    className: "cream",
    icon: "∞"
  }
];

function aboutTemplate() {
  return `
    <section class="about-page" aria-labelledby="about-title">
      <div class="about-hero page-shell">
        <div class="about-hero__copy reveal">
          <span class="section-tag">THE BIGGER PICTURE</span>
          <h1 id="about-title">ONCHAIN KITTY<br /><em>EVOLVES</em><br />BEYOND NFTs</h1>
          <p>Onchain Kitty begins as an NFT collection but is designed to evolve into a broader interactive ecosystem.</p>
        </div>
        <div class="about-hero__visual reveal">
          <div class="about-kitty-card">
            <img src="/assets/onchain-kitty.jpg" alt="Official Onchain Kitty character" width="1536" height="1536" />
          </div>
          <span class="about-sticker about-sticker--one" aria-hidden="true">BEGIN<br />HERE</span>
          <span class="about-sticker about-sticker--two" aria-hidden="true">KEEP<br />EVOLVING</span>
        </div>
      </div>

      <div class="evolution-marquee" aria-label="NFTs to stake to game to earn to more">
        <div>
          <span>NFTs</span><b>→</b><span>STAKE</span><b>→</b><span>GAME</span><b>→</b><span>EARN</span><b>→</b><span>MORE</span>
        </div>
      </div>

      <div class="evolution-section page-shell">
        <div class="evolution-intro reveal">
          <span>THE EVOLUTION MAP</span>
          <p>One recognizable Kitty. More ways to own, participate, play, and shape what comes next.</p>
        </div>
        <div class="evolution-grid">
          ${evolutionStages.map((stage) => `
            <article class="evolution-card evolution-card--${stage.className} reveal">
              <div class="evolution-card__top">
                <span>${stage.number}</span>
                <i aria-hidden="true">${stage.icon}</i>
              </div>
              <div>
                <small>${stage.subtitle}</small>
                <h2>${stage.title}</h2>
                <p>${stage.description}</p>
              </div>
              <span class="evolution-card__arrow" aria-hidden="true">↗</span>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="closing-statement page-shell reveal">
        <span class="closing-statement__spark" aria-hidden="true">✦</span>
        <p>The Kitty starts as an NFT.</p>
        <strong>WHAT IT BECOMES<br />IS ONLY THE <em>BEGINNING.</em></strong>
        <a class="max-button max-button--dark" href="#/home">
          <span>ENTER THE WL</span>
          <span class="button-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  `;
}

function legalShell(title, intro, content) {
  return `
    <section class="legal-page page-shell" aria-labelledby="legal-title">
      <div class="legal-heading reveal">
        <span class="section-tag section-tag--dark">ONCHAIN KITTY // LEGAL</span>
        <h1 id="legal-title">${title}</h1>
        <p>${intro}</p>
        <span class="legal-date">LAST UPDATED: 19 AUGUST 2026</span>
      </div>
      <div class="legal-layout">
        <aside class="legal-aside reveal">
          <strong>PLAIN<br />LANGUAGE.<br />CLEAR<br />TERMS.</strong>
          <a href="#/home">← BACK HOME</a>
        </aside>
        <article class="legal-content reveal">${content}</article>
      </div>
    </section>
  `;
}

function termsTemplate() {
  return legalShell(
    "TERMS &<br /><em>CONDITIONS</em>",
    "These terms explain the rules for using the Onchain Kitty website and WL application.",
    `
      <section><h2>1. Acceptance</h2><p>By using this website, you agree to these Terms &amp; Conditions. If you do not agree, do not use the site or submit a WL application.</p></section>
      <section><h2>2. Eligibility</h2><p>You are responsible for confirming that your use of this website and any related digital asset activity is lawful where you live. You must have the legal capacity to agree to these terms.</p></section>
      <section><h2>3. WL Application</h2><p>Completing social tasks or submitting a wallet does not guarantee whitelist placement, mint access, allocation, or any other benefit. Social-task completion is currently self-confirmed and may be reviewed. Duplicate, automated, misleading, or abusive submissions may be removed.</p></section>
      <section><h2>4. No Financial Promise</h2><p>Onchain Kitty is a creative digital project. Nothing on this website is financial, investment, tax, or legal advice. Future features, including staking, gameplay, earning mechanics, rewards, and utilities, are concepts under development and may change, be delayed, or not launch.</p></section>
      <section><h2>5. Wallet Safety</h2><p>The WL form requests only a public EVM wallet address. Never submit a private key, seed phrase, password, or recovery phrase. Onchain Kitty will never need those credentials through this form.</p></section>
      <section><h2>6. Intellectual Property</h2><p>The Onchain Kitty name, character, visual identity, site design, and project materials are protected by applicable intellectual-property laws. No rights are granted except the limited right to access and use this website for its intended purpose.</p></section>
      <section><h2>7. Availability and Changes</h2><p>The website and its content are provided on an “as available” basis. We may update, suspend, or discontinue pages, campaigns, features, or these terms when reasonably necessary. Material updates will be reflected by a new revision date.</p></section>
      <section><h2>8. Prohibited Conduct</h2><p>Do not interfere with the site, attempt unauthorized access, submit malicious code, impersonate another person, manipulate the application process, scrape private endpoints, or use the site for unlawful activity.</p></section>
      <section><h2>9. Limitation</h2><p>To the fullest extent permitted by applicable law, the project team is not liable for indirect, incidental, special, or consequential loss arising from site use, unavailable features, third-party platforms, wallet errors, or reliance on future-facing statements.</p></section>
      <section><h2>10. Contact</h2><p>Questions about these terms can be sent through the official X profile at <a href="${config.xProfileUrl}" target="_blank" rel="noopener noreferrer">${config.xHandle}</a>.</p></section>
    `
  );
}

function privacyTemplate() {
  return legalShell(
    "PRIVACY<br /><em>POLICY</em>",
    "This policy explains what the WL application collects, why it is used, and how it is protected.",
    `
      <section><h2>1. Information We Collect</h2><p>When you submit a WL application, we collect the public EVM wallet address you provide, an optional X username, the submission timestamp, and your confirmation status for the follow, like, repost, and comment tasks. Standard server security logs may temporarily include technical data such as request time and network information.</p></section>
      <section><h2>2. How We Use It</h2><p>We use this information to operate the WL campaign, identify duplicate wallet submissions, review eligibility, protect the application from abuse, communicate campaign updates through public channels, and export an internal application list.</p></section>
      <section><h2>3. What We Do Not Request</h2><p>We do not request or need your seed phrase, private key, wallet password, government ID, banking credentials, or payment-card details through this application. Never provide them.</p></section>
      <section><h2>4. Storage and Access</h2><p>WL submissions are stored on the server and are not exposed through a public database endpoint. CSV export is restricted to an authenticated admin route. Reasonable safeguards are used, but no online system can be guaranteed completely secure.</p></section>
      <section><h2>5. Sharing</h2><p>We do not sell WL application data. Information may be shared with service providers strictly as needed to host, secure, or operate the website, or when required by applicable law. Public wallet addresses and public X usernames may already be visible on their respective networks.</p></section>
      <section><h2>6. Retention</h2><p>Application information is retained only as long as reasonably necessary for the WL campaign, project administration, security, dispute handling, and legal obligations. Records may then be deleted or anonymized.</p></section>
      <section><h2>7. Your Choices</h2><p>You may request access, correction, or deletion where applicable by contacting the official project account. Some records may need to be retained for security or legal reasons. Device-local task progress can be removed by clearing this site’s browser storage.</p></section>
      <section><h2>8. Third-Party Links</h2><p>This website links to X. Your activity on X is governed by X’s own terms and privacy practices. Onchain Kitty does not receive proof of your social activity through an X API in the current application flow.</p></section>
      <section><h2>9. Updates</h2><p>This policy may change as the project, application, or legal requirements evolve. The current revision date appears at the top of this page.</p></section>
      <section><h2>10. Contact</h2><p>Privacy questions or requests can be sent through the official X profile at <a href="${config.xProfileUrl}" target="_blank" rel="noopener noreferrer">${config.xHandle}</a>.</p></section>
    `
  );
}

const templates = {
  home: homeTemplate,
  game: gameTemplate,
  about: aboutTemplate,
  terms: termsTemplate,
  privacy: privacyTemplate
};

function updateNavigation(route) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === route;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function updateDocumentTitle(route) {
  const titles = {
    home: "Onchain Kitty",
    game: "Game — Onchain Kitty",
    about: "About — Onchain Kitty",
    terms: "Terms & Conditions — Onchain Kitty",
    privacy: "Privacy Policy — Onchain Kitty"
  };
  document.title = titles[route];
}

function initializeRevealAnimations() {
  const elements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

  elements.forEach((element) => observer.observe(element));
}

function attachHomeEvents() {
  document.querySelectorAll("[data-task-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const taskId = button.dataset.taskAction;
      const task = taskDefinitions.find((item) => item.id === taskId);
      const taskState = state.tasks[taskId];
      if (!task || !taskState || taskState.complete) return;

      if (!taskState.opened) {
        window.open(task.url, "_blank", "noopener,noreferrer");
        taskState.opened = true;
      } else {
        taskState.complete = true;
      }

      saveTaskState();
      renderRoute({ preserveScroll: true });
      if (taskState.complete) showToast(`${task.label} marked complete.`);
    });
  });

  const walletForm = document.querySelector("[data-wallet-form]");
  if (walletForm) walletForm.addEventListener("submit", submitApplication);

  document.querySelector("[data-share-x]")?.addEventListener("click", () => {
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(config.shareText)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  });

  document.querySelector("[data-copy-share]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(config.shareText);
      showToast("Share text copied.");
    } catch {
      showToast("Copy was blocked. Select the text manually.");
    }
  });
}

function setFormMessage(message, type = "error") {
  const element = document.querySelector("[data-form-message]");
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
}

function pickCampaignImage() {
  const images = Array.isArray(config.campaignImages) && config.campaignImages.length
    ? config.campaignImages
    : ["/assets/onchain-kitty.jpg"];
  if (images.length === 1) return images[0];

  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return images[randomValues[0] % images.length];
}

async function submitApplication(event) {
  event.preventDefault();
  if (!allTasksComplete() || state.submitting) return;

  const form = new FormData(event.currentTarget);
  const wallet = String(form.get("wallet") || "").trim();
  const xUsername = String(form.get("xUsername") || "").trim().replace(/^@/, "");

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    setFormMessage("Enter a valid EVM address beginning with 0x.");
    document.querySelector("#wallet-address")?.focus();
    return;
  }

  if (xUsername && !/^[A-Za-z0-9_]{1,30}$/.test(xUsername)) {
    setFormMessage("Enter a valid X username without spaces.");
    document.querySelector("#x-username")?.focus();
    return;
  }

  state.submitting = true;
  setFormMessage("Saving your application...", "info");
  const submitButton = event.currentTarget.querySelector("[type='submit']");
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "SUBMITTING...";

  try {
    const response = await fetch("/api/wl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        xUsername,
        tasks: Object.fromEntries(taskDefinitions.map((task) => [task.id, state.tasks[task.id]?.complete === true]))
      })
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result.message || "Submission failed.");

    state.submission = {
      wallet,
      submittedAt: result.submittedAt,
      image: pickCampaignImage()
    };
    localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(state.submission));
    renderRoute({ preserveScroll: true });
    document.querySelector("#wl-application")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("WL application submitted.");
  } catch (error) {
    state.submitting = false;
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "SUBMIT APPLICATION";
    setFormMessage(error.message || "The application could not be saved.");
  }
}

function renderRoute({ preserveScroll = false } = {}) {
  const route = getRoute();
  document.body.dataset.route = route;
  routeView.innerHTML = templates[route]();
  updateNavigation(route);
  updateDocumentTitle(route);
  if (route === "home") attachHomeEvents();

  requestAnimationFrame(initializeRevealAnimations);
  if (!preserveScroll) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    routeView.focus?.({ preventScroll: true });
  }
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

window.addEventListener("hashchange", () => renderRoute());

if (!location.hash || !validRoutes.has(getRoute())) {
  history.replaceState(null, "", "#/home");
}

renderRoute();
