const statusEl = document.getElementById("status");
const voteBtn = document.getElementById("vote-btn");
const emailInput = document.getElementById("email");
const targetInput = document.getElementById("target");

// Load saved settings
chrome.storage.local.get(["email", "target"], (data) => {
  if (data.email) emailInput.value = data.email;
  if (data.target) targetInput.value = data.target;
});

function setStatus(msg, type = "") {
  statusEl.className = type;
  statusEl.textContent = msg;
}

voteBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const target = targetInput.value.trim();

  if (!email || !target) {
    setStatus("Please fill in both fields.", "error");
    return;
  }

  // Save settings for next time
  chrome.storage.local.set({ email, target });

  // Check we're on the right page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url.includes("secondstreetapp.com")) {
    setStatus("❌ Please navigate to the Chronogram ballot page first.", "error");
    return;
  }

  voteBtn.disabled = true;
  setStatus("Running...", "");

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: autoVote,
      args: [email, target],
    },
    (results) => {
      voteBtn.disabled = false;
      if (chrome.runtime.lastError) {
        setStatus("❌ Error: " + chrome.runtime.lastError.message, "error");
        return;
      }
      const result = results?.[0]?.result;
      if (!result) {
        setStatus("❌ Script returned no result. Try refreshing the ballot page.", "error");
        return;
      }
      if (result.error) {
        setStatus("❌ " + result.error, "error");
        return;
      }

      let msg = "";
      if (result.voted.length) {
        msg += `✅ Voted in ${result.voted.length} categor${result.voted.length === 1 ? "y" : "ies"}:\n${result.voted.join(", ")}\n`;
      }
      if (result.alreadyVoted.length) {
        msg += `⏭️ Already voted:\n${result.alreadyVoted.join(", ")}\n`;
      }
      if (result.notFound) {
        msg += `⚠️ "${target}" not found in any category.`;
      }
      if (!msg) msg = "No nominations found.";

      const type = result.voted.length ? "success" : result.alreadyVoted.length ? "warning" : "error";
      setStatus(msg.trim(), type);
    }
  );
});

// This function is injected into the ballot page
async function autoVote(email, targetName) {
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function waitFor(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) { clearInterval(interval); resolve(el); }
        if (Date.now() - start > timeout) { clearInterval(interval); resolve(null); }
      }, 200);
    });
  }

  // Scroll to bottom so all categories lazy-load, then wait for them to render
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(3000);

  const target = targetName.toLowerCase();
  const voted = [];
  const alreadyVoted = [];

  const allEntrants = document.querySelectorAll(
    '[data-test="entrant-list-item"], .material-list-tile.entrant-list-item'
  );

  if (!allEntrants.length) {
    return { error: "No ballot entries found. Are you on the correct page?", voted, alreadyVoted };
  }

  const allHeaders = [...document.querySelectorAll(".category-name")];

  let foundAny = false;

  for (const entrant of allEntrants) {
    const nameEl = entrant.querySelector(".entrant-name span");
    if (!nameEl || !nameEl.textContent.toLowerCase().includes(target)) continue;

    foundAny = true;

    // Find nearest preceding category header
    let categoryName = "Unknown";
    for (let i = allHeaders.length - 1; i >= 0; i--) {
      const pos = nameEl.compareDocumentPosition(allHeaders[i]);
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
        categoryName = allHeaders[i].textContent.trim();
        break;
      }
    }

    // Already voted?
    const isVoted = !!entrant.querySelector(".entry-voted-for, [class*='voted']");
    if (isVoted) {
      alreadyVoted.push(categoryName);
      continue;
    }

    // Click vote button
    const voteBtn = entrant.querySelector("button");
    if (!voteBtn) continue;

    voteBtn.click();
    await sleep(800);

    // Handle email registration form if it appears
    const emailInput = await waitFor('input[type="email"]', 3000);
    if (emailInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(400);
      const continueBtn = document.querySelector(
        'button[type="submit"], .ballot-register button, [data-test="register-submit"]'
      );
      if (continueBtn) {
        continueBtn.click();
        await sleep(1200);
      }
    }

    voted.push(categoryName);
    await sleep(600);
  }

  return { voted, alreadyVoted, notFound: !foundAny };
}