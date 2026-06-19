const kKanonNotesExtensionName = "KanonNotes";
const kKanonNotesFolderPath = `scripts/extensions/third-party/${kKanonNotesExtensionName}`;
const kKanonNotesSettingsFile = `${kKanonNotesFolderPath}/settings.html`;

const kKnStoragePrefix = "KN_";
const kKnEnabledKey = `${kKnStoragePrefix}Enabled`;
const kKnPanelModeKey = `${kKnStoragePrefix}PanelMode`;
const kKnPanelLayoutKey = `${kKnStoragePrefix}PanelLayout`;
const kKnNotesPrefix = `${kKnStoragePrefix}Notes_`;
const kKnMobileButtonId = "kanon_notes_mobile_button";

let gKnEnabled = true;
let gKnPanelMode = "collapsed";
let gKnNotes = "";

function KnGetContextSafe() {
    try {
        return SillyTavern.getContext();
    } catch {
        return {};
    }
}

function KnEscapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function KnIsMobileView() {
    return window.matchMedia("(max-width: 760px)").matches;
}

function KnClamp(value, min, max) {
    const number = parseInt(value, 10);
    if (Number.isNaN(number)) return min;
    return Math.max(min, Math.min(max, number));
}

function KnGetChatId() {
    const context = KnGetContextSafe();

    return (
        context.chatMetadata?.chat_id ||
        context.characters?.[context.characterId]?.chat ||
        "default"
    );
}

function KnGetNotesKey() {
    return `${kKnNotesPrefix}${KnGetChatId()}`;
}

function KnGetCurrentCharacterDossier() {
    const context = KnGetContextSafe();
    const character = context.characters?.[context.characterId];

    if (!character) {
        return {
            name: "",
            description: ""
        };
    }

    return {
        name: character.name || context.name2 || "",
        description: character.description || ""
    };
}

function KnLoadSettings() {
    gKnEnabled = localStorage.getItem(kKnEnabledKey) !== "false";
    gKnPanelMode = localStorage.getItem(kKnPanelModeKey) || "collapsed";
}

function KnSaveSettings() {
    localStorage.setItem(kKnEnabledKey, String(gKnEnabled));
    localStorage.setItem(kKnPanelModeKey, gKnPanelMode);
}

function KnLoadNotes() {
    try {
        gKnNotes = localStorage.getItem(KnGetNotesKey()) || "";
    } catch {
        gKnNotes = "";
    }
}

function KnSaveNotes() {
    try {
        localStorage.setItem(KnGetNotesKey(), gKnNotes || "");
    } catch (error) {
        console.warn("[KanonNotes] Save notes failed:", error);
    }
}

function KnRenderLauncher() {
    return `
        <div class="kn-launcher">
            <button type="button" class="kn-launch-btn" data-kn-open="notes" title="Notes">✎</button>
            <button type="button" class="kn-launch-btn" data-kn-open="dossier" title="Dossier">☰</button>
        </div>
    `;
}

function KnRenderNotesPanel() {
    return `
        <div class="kn-panel">
            <div class="kn-header">
                <div>
                    <div class="kn-title">KanonNotes</div>
                    <div class="kn-subtitle">local notes</div>
                </div>

                <div class="kn-actions">
                    <button type="button" class="kn-small-btn" data-kn-open="dossier" title="Dossier">☰</button>
                    <button type="button" class="kn-small-btn" data-kn-collapse title="Collapse">×</button>
                </div>
            </div>

            <div class="kn-body">
                <textarea class="kn-notes-input" placeholder="Your private local notes. Not sent to the model.">${KnEscapeHtml(gKnNotes)}</textarea>
            </div>
        </div>
    `;
}

function KnRenderDossierPanel() {
    const dossier = KnGetCurrentCharacterDossier();

    return `
        <div class="kn-panel">
            <div class="kn-header">
                <div>
                    <div class="kn-title">Dossier</div>
                    <div class="kn-subtitle">${KnEscapeHtml(dossier.name || "current character")}</div>
                </div>

                <div class="kn-actions">
                    <button type="button" class="kn-small-btn" data-kn-open="notes" title="Notes">✎</button>
                    <button type="button" class="kn-small-btn" data-kn-collapse title="Collapse">×</button>
                </div>
            </div>

            <div class="kn-body kn-dossier-body">
                ${
                    dossier.description
                        ? KnEscapeHtml(dossier.description).replace(/\n/g, "<br>")
                        : `<span class="kn-empty">Character description not found.</span>`
                }
            </div>
        </div>
    `;
}

function KnGetOrCreateHost() {
    let host = document.getElementById("kanon_notes_host");

    if (!host) {
        host = document.createElement("div");
        host.id = "kanon_notes_host";
        document.body.appendChild(host);
        KnRestoreLayout(host);
    }

    return host;
}

function KnRender() {
    const existing = document.getElementById("kanon_notes_host");

    if (KnIsMobileView()) {
        existing?.remove();
        KnRemoveMobileButton();
        return;
    }

    if (!gKnEnabled) {
        existing?.remove();
        KnRemoveMobileButton();
        return;
    }

    KnLoadNotes();

    const host = KnGetOrCreateHost();

    host.className = gKnPanelMode === "collapsed"
        ? "kn-host kn-collapsed"
        : "kn-host kn-open";

    if (gKnPanelMode === "notes") {
        host.innerHTML = KnRenderNotesPanel();
    } else if (gKnPanelMode === "dossier") {
        host.innerHTML = KnRenderDossierPanel();
    } else {
        host.innerHTML = KnRenderLauncher();
    }

    KnWireHost(host);
    KnMakeDraggable(host);
}

function KnWireHost(host) {
    host.querySelectorAll("[data-kn-open]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            gKnPanelMode = button.dataset.knOpen || "collapsed";
            KnSaveSettings();
            KnRender();
        });
    });

    host.querySelectorAll("[data-kn-collapse]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            gKnPanelMode = "collapsed";
            KnSaveSettings();
            KnRender();
        });
    });

    host.querySelector(".kn-notes-input")?.addEventListener("input", event => {
        gKnNotes = event.target.value || "";
        KnSaveNotes();
    });
}

function KnRestoreLayout(host) {
    try {
        const raw = localStorage.getItem(kKnPanelLayoutKey);
        if (!raw) return;

        const data = JSON.parse(raw);

        host.style.left = `${KnClamp(data.left, 0, window.innerWidth - 90)}px`;
        host.style.top = `${KnClamp(data.top, 0, window.innerHeight - 70)}px`;
        host.style.right = "auto";
        host.style.bottom = "auto";
    } catch {
        // Optional layout restore.
    }
}

function KnSaveLayout(host) {
    if (!host) return;

    const rect = host.getBoundingClientRect();

    localStorage.setItem(kKnPanelLayoutKey, JSON.stringify({
        left: Math.round(rect.left),
        top: Math.round(rect.top)
    }));
}

function KnMakeDraggable(host) {
    if (KnIsMobileView()) return;
    if (!host) return;

    if (host._knDragCleanup) {
        host._knDragCleanup();
        host._knDragCleanup = null;
    }

    const dragHandle = host.querySelector(".kn-header") || host.querySelector(".kn-launcher");
    if (!dragHandle) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let activePointerId = null;

    const onPointerDown = event => {
        if (event.target.closest("button, textarea")) return;
        if (event.button !== undefined && event.button !== 0) return;

        const rect = host.getBoundingClientRect();

        dragging = true;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        host.style.left = `${rect.left}px`;
        host.style.top = `${rect.top}px`;
        host.style.right = "auto";
        host.style.bottom = "auto";

        document.body.classList.add("kn-dragging");

        try {
            dragHandle.setPointerCapture?.(event.pointerId);
        } catch {}

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);

        event.preventDefault();
    };

    const onPointerMove = event => {
        if (!dragging) return;
        if (activePointerId !== null && event.pointerId !== activePointerId) return;

        const rect = host.getBoundingClientRect();

        const left = KnClamp(
            startLeft + event.clientX - startX,
            0,
            Math.max(0, window.innerWidth - rect.width)
        );

        const top = KnClamp(
            startTop + event.clientY - startY,
            0,
            Math.max(0, window.innerHeight - rect.height)
        );

        host.style.left = `${left}px`;
        host.style.top = `${top}px`;
        host.style.right = "auto";
        host.style.bottom = "auto";
    };

    const onPointerUp = event => {
        if (!dragging) return;

        dragging = false;
        activePointerId = null;

        document.body.classList.remove("kn-dragging");

        try {
            dragHandle.releasePointerCapture?.(event.pointerId);
        } catch {}

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        KnSaveLayout(host);
    };

    dragHandle.addEventListener("pointerdown", onPointerDown);

    host._knDragCleanup = () => {
        dragHandle.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        document.body.classList.remove("kn-dragging");
    };
}

function KnSyncSettingsControls() {
    $("#kanon_notes_enabled").prop("checked", gKnEnabled);
}


function KnRemoveMobileButton() {
    document.getElementById(kKnMobileButtonId)?.remove();
}

function KnMountMobileButton() {
    KnRemoveMobileButton();

    if (!gKnEnabled || !KnIsMobileView()) return;

    const leftSendForm = document.getElementById("leftSendForm");
    if (!leftSendForm) return;

    const button = document.createElement("button");
    button.id = kKnMobileButtonId;
    button.type = "button";
    button.className = "menu_button fa-solid fa-book-open-reader interactable";
    button.title = "KanonNotes";
    button.tabIndex = 0;
    button.setAttribute("aria-label", "KanonNotes");

    const togglePanel = event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();

        gKnPanelMode = gKnPanelMode === "notes" ? "collapsed" : "notes";
        KnSaveSettings();

        setTimeout(() => {
            KnRender();
        }, 0);
    };

    button.addEventListener("pointerdown", togglePanel, { capture: true });
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }, { capture: true });

    button.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        togglePanel(event);
    });

    const extensionsButton = document.getElementById("extensionsMenuButton");

    if (extensionsButton?.parentElement === leftSendForm) {
        extensionsButton.after(button);
    } else {
        leftSendForm.appendChild(button);
    }
}

function KnWireSettings() {
    $("#kanon_notes_enabled").on("change", function () {
        gKnEnabled = $(this).is(":checked");
        KnSaveSettings();
        KnRender();
    });
}

function KnOnChatChanged() {
    KnLoadNotes();
    KnMountMobileButton();
    KnRender();
}

jQuery(async () => {
    const context = KnGetContextSafe();

    try {
        const settingsHtml = await $.get(kKanonNotesSettingsFile);
        const $extensions = $("#extensions_settings");
        const $existing = $extensions.find(".kanon-notes-settings");

        if ($existing.length) {
            $existing.replaceWith(settingsHtml);
        } else {
            $extensions.append(settingsHtml);
        }
    } catch (error) {
        console.warn("[KanonNotes] settings.html not loaded:", error);
    }

    KnLoadSettings();
    KnLoadNotes();
    KnSyncSettingsControls();
    KnWireSettings();

    if (context.eventTypes?.CHAT_CHANGED) {
        context.eventSource.on(context.eventTypes.CHAT_CHANGED, KnOnChatChanged);
    }

    setTimeout(KnRender, 250);

window.addEventListener("resize", () => {
    KnRender();
});
    
    console.log("[KanonNotes] ready");
});
