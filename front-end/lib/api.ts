import { API_BASE_URL } from "@/lib/constants";

export type CourseComponent = "theory" | "lab";

export interface CourseMaterial {
  id: string;
  title: string;
  component: CourseComponent;
  week?: number;
  topic?: string;
  tags?: string[];
  type: "slide" | "pdf" | "code" | "note" | "other";
  url?: string;
  createdAt?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  snippet: string;
  source: string;
  component: CourseComponent;
}

export interface GeneratedContent {
  title: string;
  type: "notes" | "slides" | "pdf" | "code";
  body: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

// Toggle between demo data and real API integration.
// When you're ready to plug in the backend, set
// NEXT_PUBLIC_USE_DEMO_DATA=false in `.env`.
const USE_DEMO_DATA =
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === undefined
    ? true
    : process.env.NEXT_PUBLIC_USE_DEMO_DATA !== "false";

function demoDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------
// Demo data (front-end only)
// -------------------------

let demoMaterials: CourseMaterial[] = [
  {
    id: "mat-1",
    title: "Week 1 – Introduction to Algorithms",
    component: "theory",
    week: 1,
    topic: "Course overview, complexity, and problem solving",
    tags: ["intro", "complexity", "big-o"],
    type: "slide",
    url: "#",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mat-2",
    title: "Week 2 – Sorting Lab Starter Code",
    component: "lab",
    week: 2,
    topic: "Implementing and benchmarking sorting algorithms",
    tags: ["sorting", "lab", "arrays"],
    type: "code",
    url: "#",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mat-3",
    title: "Week 3 – Divide & Conquer Notes",
    component: "theory",
    week: 3,
    topic: "Recurrence relations, merge sort, and quicksort",
    tags: ["divide-and-conquer", "recurrence"],
    type: "note",
    url: "#",
    createdAt: new Date().toISOString(),
  },
];

// -------------------------
// Real API implementation
// -------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function listMaterialsReal(): Promise<CourseMaterial[]> {
  const res = await fetch(`${API_BASE_URL}/ingest/materials`, {
    next: { revalidate: 10 },
  });
  return handleResponse<CourseMaterial[]>(res);
}

async function uploadMaterialReal(formData: FormData): Promise<CourseMaterial> {
  const res = await fetch(`${API_BASE_URL}/storage/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<CourseMaterial>(res);
}

async function semanticSearchReal(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return handleResponse<SearchResult[]>(res);
}

async function ragQueryReal(query: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await handleResponse<{ answer: string }>(res);
  return data.answer;
}

async function generateLearningMaterialReal(options: {
  topic: string;
  component: CourseComponent;
  type: GeneratedContent["type"];
  language?: string;
}): Promise<GeneratedContent> {
  const res = await fetch(`${API_BASE_URL}/media/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return handleResponse<GeneratedContent>(res);
}

async function validateCodeSnippetReal(code: string, language: string) {
  const res = await fetch(`${API_BASE_URL}/rag/validate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
  });
  return handleResponse<{
    isValid: boolean;
    diagnostics?: string[];
    testsPassed?: boolean;
  }>(res);
}

async function chatWithCourseReal(
  history: Omit<ChatMessage, "id" | "createdAt">[]
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE_URL}/rag/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });
  return handleResponse<ChatMessage>(res);
}

// -------------------------
// Demo implementation
// -------------------------

async function listMaterialsDemo(): Promise<CourseMaterial[]> {
  await demoDelay();
  // Sort newest first for nicer UX
  return [...demoMaterials].sort(
    (a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime()
  );
}

async function uploadMaterialDemo(formData: FormData): Promise<CourseMaterial> {
  await demoDelay();
  const title = (formData.get("title") as string) ?? "Untitled material";
  const component = (formData.get("component") as CourseComponent) ?? "theory";
  const weekRaw = formData.get("week") as string | null;
  const topic = (formData.get("topic") as string) ?? "";
  const tagsRaw = (formData.get("tags") as string) ?? "";
  const type =
    (formData.get("type") as CourseMaterial["type"]) ?? "other";

  const week = weekRaw ? Number(weekRaw) : undefined;
  const tags =
    tagsRaw.trim().length > 0
      ? tagsRaw.split(",").map((t) => t.trim())
      : undefined;

  const created: CourseMaterial = {
    id: `mat-${Date.now()}`,
    title,
    component,
    week,
    topic: topic || undefined,
    tags,
    type,
    url: "#",
    createdAt: new Date().toISOString(),
  };

  demoMaterials = [created, ...demoMaterials];
  return created;
}

async function semanticSearchDemo(query: string): Promise<SearchResult[]> {
  await demoDelay();
  const q = query.toLowerCase();
  const matches = demoMaterials.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      (m.topic && m.topic.toLowerCase().includes(q)) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
  );

  if (matches.length === 0) {
    return [
      {
        id: "search-empty",
        score: 0.1,
        source: "Demo – no exact match",
        component: "theory",
        snippet:
          "No direct matches in the demo corpus. Try searching for 'sorting', 'divide and conquer', or 'dynamic programming'.",
      },
    ];
  }

  return matches.map((m, idx) => ({
    id: `search-${m.id}`,
    score: 0.95 - idx * 0.05,
    source: m.title,
    component: m.component,
    snippet:
      m.topic ??
      `This material is tagged with: ${(m.tags ?? []).join(", ") || "no tags"}.`,
  }));
}

async function ragQueryDemo(query: string): Promise<string> {
  await demoDelay();
  return [
    `Here is a demo, syllabus-grounded explanation for your query: "${query}".`,
    "",
    "In the real system this answer will be generated from your uploaded slides, PDFs, and lab notebooks using retrieval-augmented generation.",
    "",
    "For now, explore the demo materials on sorting, divide & conquer, and lab starter code to see how the interface will behave.",
  ].join("\n");
}

async function generateLearningMaterialDemo(options: {
  topic: string;
  component: CourseComponent;
  type: GeneratedContent["type"];
  language?: string;
}): Promise<GeneratedContent> {
  await demoDelay(600);

  const baseTitle =
    options.component === "theory"
      ? `Theory notes – ${options.topic}`
      : `Lab walkthrough – ${options.topic}`;

  if (options.type === "code") {
    const lang = options.language ?? "python";
    return {
      title: `${baseTitle} (${lang} demo)`,
      type: "code",
      language: lang,
      body: [
        `# ${options.topic} – demo ${lang} snippet`,
        "",
        "def solve():",
        '    """Example function generated from course context (demo only)."""',
        "    # TODO: replace with real implementation when backend is wired",
        "    data = [5, 2, 9, 1]",
        "    return sorted(data)",
        "",
        "if __name__ == '__main__':",
        "    print(solve())",
      ].join("\n"),
    };
  }

  const paragraphs = [
    `These ${options.type} are generated from demo course content for the topic "${options.topic}".`,
    "In the production system, this section would be grounded in your uploaded lecture slides, PDFs, and lab sheets.",
    "",
    "- Key idea 1: Clearly state the core definition or intuition.",
    "- Key idea 2: Connect the concept to a concrete example from the syllabus.",
    "- Key idea 3: Show how this appears in both Theory and Lab components.",
  ].join("\n");

  return {
    title: baseTitle,
    type: options.type,
    body: paragraphs,
  };
}

async function validateCodeSnippetDemo(code: string, language: string) {
  await demoDelay(500);

  const diagnostics: string[] = [];
  if (!code.includes("return")) {
    diagnostics.push("Consider returning a value from at least one function.");
  }
  if (language.toLowerCase().startsWith("py") && !code.includes("def ")) {
    diagnostics.push("Python demo hint: define at least one function using `def`.");
  }

  return {
    isValid: diagnostics.length === 0,
    diagnostics,
    testsPassed: diagnostics.length === 0,
  };
}

async function chatWithCourseDemo(
  history: Omit<ChatMessage, "id" | "createdAt">[]
): Promise<ChatMessage> {
  await demoDelay(450);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const content = lastUser?.content ?? "";

  const replyLines = [
    "This is a demo answer from the course tutor.",
    "",
    "In a real deployment, this response would be grounded in your uploaded course materials via RAG.",
  ];

  if (content) {
    replyLines.unshift(`You asked: "${content}"`, "");
  }

  return {
    id: `chat-${Date.now()}`,
    role: "assistant",
    content: replyLines.join("\n"),
    createdAt: new Date().toISOString(),
  };
}

// -------------------------
// Public facade
// -------------------------

export async function listMaterials(): Promise<CourseMaterial[]> {
  return USE_DEMO_DATA ? listMaterialsDemo() : listMaterialsReal();
}

export async function uploadMaterial(
  formData: FormData
): Promise<CourseMaterial> {
  return USE_DEMO_DATA ? uploadMaterialDemo(formData) : uploadMaterialReal(formData);
}

export async function semanticSearch(query: string): Promise<SearchResult[]> {
  return USE_DEMO_DATA ? semanticSearchDemo(query) : semanticSearchReal(query);
}

export async function ragQuery(query: string): Promise<string> {
  return USE_DEMO_DATA ? ragQueryDemo(query) : ragQueryReal(query);
}

export async function generateLearningMaterial(options: {
  topic: string;
  component: CourseComponent;
  type: GeneratedContent["type"];
  language?: string;
}): Promise<GeneratedContent> {
  return USE_DEMO_DATA
    ? generateLearningMaterialDemo(options)
    : generateLearningMaterialReal(options);
}

export async function validateCodeSnippet(code: string, language: string) {
  return USE_DEMO_DATA
    ? validateCodeSnippetDemo(code, language)
    : validateCodeSnippetReal(code, language);
}

export async function chatWithCourse(
  history: Omit<ChatMessage, "id" | "createdAt">[]
): Promise<ChatMessage> {
  return USE_DEMO_DATA
    ? chatWithCourseDemo(history)
    : chatWithCourseReal(history);
}


