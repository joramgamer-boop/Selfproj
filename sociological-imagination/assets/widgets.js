/* ============================================================
   Reusable lesson widgets for the Sociological Imagination
   workspace. Vanilla JS, no dependencies, works over file://.

   Mount points are declared in the HTML; config travels in a
   child <script type="application/json"> block.

   ---- Quiz ---------------------------------------------------
   <div data-quiz>
     <script type="application/json">
     { "title": "Classify",
       "items": [
         { "prompt":  "Trouble or issue?",
           "scenario": "Optional italicised case text.",
           "options": ["Personal trouble", "Public issue"],
           "answer":  1,
           "why":     "Explanation shown after answering.",
           "cite":    "Mills, p. 9" }
       ] }
     </script>
   </div>

   ---- Recall -------------------------------------------------
   <div data-recall>
     <script type="application/json">
     { "title":  "From memory",
       "prompt": "Write the definition without looking.",
       "model":  "<p>The model answer, as HTML.</p>" }
     </script>
   </div>
   ============================================================ */

(function () {
  "use strict";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function config(mount) {
    var script = mount.querySelector('script[type="application/json"]');
    if (!script) return null;
    try {
      return JSON.parse(script.textContent);
    } catch (err) {
      mount.textContent = "Widget config could not be parsed: " + err.message;
      return null;
    }
  }

  /* ---------------- Quiz ---------------- */

  function mountQuiz(mount) {
    var cfg = config(mount);
    if (!cfg || !cfg.items || !cfg.items.length) return;

    var index = 0;
    var score = 0;
    var answered = false;

    mount.className = "widget";
    mount.innerHTML = "";

    var head = el("div", "widget__head");
    var title = el("span", "widget__title", cfg.title || "Practice");
    var score_ = el("span", "score");
    head.appendChild(title);
    head.appendChild(score_);

    var prompt = el("p", "widget__prompt");
    var opts = el("div", "opts");
    var feedback = el("div", "feedback");
    var verdict = el("div", "feedback__verdict");
    var why = el("div");
    var cite = el("div", "cited");
    feedback.appendChild(verdict);
    feedback.appendChild(why);
    feedback.appendChild(cite);

    var controls = el("div", "controls");
    var next = el("button", "btn", "Next");
    next.type = "button";
    controls.appendChild(next);
    controls.style.display = "none";

    mount.appendChild(head);
    mount.appendChild(prompt);
    mount.appendChild(opts);
    mount.appendChild(feedback);
    mount.appendChild(controls);

    function render() {
      var item = cfg.items[index];
      answered = false;

      score_.className = "score";
      score_.textContent = index + 1 + " / " + cfg.items.length;

      prompt.innerHTML = "";
      prompt.appendChild(document.createTextNode(item.prompt || ""));
      if (item.scenario) {
        var sc = el("span", "scenario", item.scenario);
        prompt.appendChild(sc);
      }

      opts.innerHTML = "";
      item.options.forEach(function (label, i) {
        var b = el("button", "opt", label);
        b.type = "button";
        b.addEventListener("click", function () {
          choose(i);
        });
        opts.appendChild(b);
      });

      feedback.className = "feedback";
      controls.style.display = "none";
      next.textContent = index === cfg.items.length - 1 ? "See result" : "Next";
    }

    function choose(picked) {
      if (answered) return;
      answered = true;

      var item = cfg.items[index];
      var right = picked === item.answer;
      if (right) score += 1;

      Array.prototype.forEach.call(opts.children, function (b, i) {
        b.disabled = true;
        if (i === item.answer) b.classList.add("is-correct");
        else if (i === picked) b.classList.add("is-wrong");
        else b.classList.add("is-dimmed");
      });

      verdict.className = "feedback__verdict " + (right ? "is-correct" : "is-wrong");
      verdict.textContent = right ? "Right" : "Not quite";
      why.innerHTML = "<p>" + (item.why || "") + "</p>";
      cite.textContent = item.cite || "";
      feedback.classList.add("is-shown");
      controls.style.display = "flex";
    }

    function finish() {
      mount.innerHTML = "";
      var done = el("div", "widget__head");
      done.appendChild(el("span", "widget__title", cfg.title || "Practice"));
      var s = el("span", "score is-done", score + " / " + cfg.items.length);
      done.appendChild(s);
      mount.appendChild(done);

      var msg = el("p", "widget__prompt");
      msg.textContent =
        score === cfg.items.length
          ? "Clean sweep. You are applying the distinction, not guessing it."
          : score >= Math.ceil(cfg.items.length * 0.6)
          ? "Solid. Re-run it later today — spacing is what makes this stick."
          : "Worth another pass. Re-read the definitions above, then run it again.";
      mount.appendChild(msg);

      var again = el("button", "btn btn--ghost", "Run it again");
      again.type = "button";
      again.addEventListener("click", function () {
        index = 0;
        score = 0;
        mountQuiz(mount);
      });
      var wrap = el("div", "controls");
      wrap.appendChild(again);
      mount.appendChild(wrap);
    }

    next.addEventListener("click", function () {
      if (index === cfg.items.length - 1) finish();
      else {
        index += 1;
        render();
      }
    });

    mount.addEventListener("keydown", function (e) {
      if (answered) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= opts.children.length) opts.children[n - 1].click();
    });

    render();
  }

  /* ---------------- Recall ---------------- */

  function mountRecall(mount) {
    var cfg = config(mount);
    if (!cfg) return;

    mount.className = "widget";
    mount.innerHTML = "";

    var head = el("div", "widget__head");
    head.appendChild(el("span", "widget__title", cfg.title || "From memory"));
    head.appendChild(el("span", "score", "no peeking"));

    var prompt = el("p", "widget__prompt", cfg.prompt || "");

    var field = el("textarea", "recall__field");
    field.setAttribute("placeholder", "Write it out in your own words…");
    field.setAttribute("spellcheck", "false");

    var reveal = el("button", "btn", "Show the model answer");
    reveal.type = "button";
    reveal.disabled = true;

    var anyway = el("button", "btn btn--ghost", "Reveal anyway");
    anyway.type = "button";

    var controls = el("div", "controls");
    controls.appendChild(reveal);
    controls.appendChild(anyway);

    var model = el("div", "recall__model");
    model.innerHTML =
      '<div class="feedback__verdict">Compare with</div>' + (cfg.model || "");

    field.addEventListener("input", function () {
      reveal.disabled = field.value.trim().length < 15;
    });

    function show() {
      model.classList.add("is-shown");
      controls.style.display = "none";
    }
    reveal.addEventListener("click", show);
    anyway.addEventListener("click", show);

    mount.appendChild(head);
    mount.appendChild(prompt);
    mount.appendChild(field);
    mount.appendChild(controls);
    mount.appendChild(model);
  }

  /* ---------------- Boot ---------------- */

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-quiz]"), mountQuiz);
    Array.prototype.forEach.call(document.querySelectorAll("[data-recall]"), mountRecall);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
