const jsonLd = {
	"@context": "https://schema.org",
	"@type": "WebPage",
	url: "https://docs.mesh-ai-gateway.io",
	name: "Mesh AI Gateway Documentation",
	description:
		"Comprehensive documentation for Mesh AI Gateway, an open-source LLM gateway for routing, governance, and observability.",
	publisher: {
		"@type": "Organization",
		name: "Mesh AI Gateway",
		url: "https://github.com/mesh-ai-gateway/mesh-ai-gateway",
		logo: {
			"@type": "ImageObject",
			url: "https://docs.mesh-ai-gateway.io/media/bifrost-logo.png",
			width: 300,
			height: 60,
		},
		sameAs: ["https://github.com/mesh-ai-gateway/mesh-ai-gateway", "https://discord.gg/exN5KAydbU"],
	},
	mainEntity: {
		"@type": "TechArticle",
		name: "Mesh AI Gateway Documentation",
		url: "https://github.com/mesh-ai-gateway/mesh-ai-gateway",
		headline: "Mesh AI Gateway Docs",
		description:
			"Mesh AI Gateway provides a unified, provider-agnostic interface for LLM workloads with open-source deployment paths.",
		inLanguage: "en",
	},
};

function injectJsonLd() {
	const script = document.createElement("script");
	script.type = "application/ld+json";
	script.text = JSON.stringify(jsonLd);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			document.head.appendChild(script);
		});
	} else {
		document.head.appendChild(script);
	}

	return () => {
		if (script.parentNode) {
			script.parentNode.removeChild(script);
		}
	};
}

// Call the function to inject JSON-LD
const cleanup = injectJsonLd();

// Cleanup when needed
// cleanup()
