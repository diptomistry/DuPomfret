"use client";

import Script from "next/script";

const BOTPRESS_SCRIPT = "https://cdn.botpress.cloud/webchat/v3.5/inject.js";

function initBotpress() {
  if (typeof window === "undefined") return;
  const wp = window as unknown as { botpress?: { on: (e: string, fn: () => void) => void; init: (c: object) => void; open: () => void } };
  let attempts = 0;
  const maxAttempts = 40;
  function run() {
    if (!wp.botpress) {
      if (++attempts < maxAttempts) setTimeout(run, 50);
      return;
    }
    const bp = wp.botpress;
    bp.on("webchat:ready", () => {});
    bp.init({
      botId: "853bff5b-d29f-4ebb-8760-367ca5531829",
      configuration: {
        version: "v2",
        botName: "System Assistant",
        botDescription: "",
        website: {},
        email: {},
        phone: {},
        termsOfService: {},
        privacyPolicy: {},
        color: "#3276EA",
        variant: "solid",
        headerVariant: "glass",
        themeMode: "light",
        fontFamily: "inter",
        radius: 4,
        feedbackEnabled: false,
        footer: "",
        soundEnabled: false,
        proactiveMessageEnabled: false,
        proactiveBubbleMessage: "Hi! 👋 Need help?",
        proactiveBubbleTriggerType: "afterDelay",
        proactiveBubbleDelayTime: 10,
      },
      clientId: "fd4096cd-428d-4b8f-9839-50b11ea89afc",
      selector: "#webchat",
    });
  }
  run();
}

export function Chatbot() {
  return (
    <>
      <Script
        src={BOTPRESS_SCRIPT}
        strategy="afterInteractive"
        onLoad={initBotpress}
      />
      <div
        id="webchat"
        className="fixed bottom-0 right-0 z-50 size-0 overflow-visible"
        aria-hidden="true"
      />
    </>
  );
}
