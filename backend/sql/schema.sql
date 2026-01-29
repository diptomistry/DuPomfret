-- Enable pgvector extension (required)
create extension if not exists vector;

-- Table to store all RAG embeddings (text, file, image)
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    content text not null,                     -- text chunk or image caption
    -- IMPORTANT:
    -- This MUST match the embedding dimension produced by your configured provider.
    -- - OpenAI `text-embedding-3-small`: 1536 dims
    -- - Replicate CLIP embeddings (e.g. krthr/clip-embeddings): commonly 768 dims
    embedding vector(768) not null,
    metadata jsonb not null default '{}'::jsonb, -- e.g., type, source, file_url, user_id
    type text not null check (type in ('text','file','image')),
    source text not null,                      -- origin: facebook_post, tour_pdf, trip_image
    file_url text,                             -- URL if type=file or type=image
    namespace text not null,                   -- for dataset separation
    created_at timestamp with time zone default now()
);

-- Index on namespace for faster filtering
create index if not exists idx_documents_namespace on documents (namespace);

-- Index on vector for similarity search
-- Using cosine distance (most common)
create index if not exists idx_documents_embedding on documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Optional: index on created_at for ordering
create index if not exists idx_documents_created_at on documents (created_at);

-- Function for efficient vector similarity search
-- Run this in Supabase SQL editor for better performance
create or replace function match_documents(
    query_embedding vector(768),
    match_namespace text,
    match_count int default 4
)
returns table (
    id uuid,
    content text,
    metadata jsonb,
    type text,
    source text,
    file_url text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        documents.id,
        documents.content,
        documents.metadata,
        documents.type,
        documents.source,
        documents.file_url,
        1 - (documents.embedding <=> query_embedding) as similarity
    from documents
    where documents.namespace = match_namespace
    order by documents.embedding <=> query_embedding
    limit match_count;
end;
$$;



/* =========================================================
   FULL SUPABASE SQL
   AI-Powered Supplementary Learning Platform
   Supabase Auth + RAG + CMS + Chat + Validation
   ========================================================= */


/* ===============================
   0. USERS & ROLES (Supabase Auth)
   =============================== */
create table if not exists users (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('admin','student')),
    display_name text,
    created_at timestamptz default now()
);

create index if not exists idx_users_role on users(role);


/* Auto-create user profile on signup */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, role)
  values (new.id, 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


/* ===============================
   1. COURSES
   =============================== */
create table if not exists courses (
    id uuid primary key default gen_random_uuid(),
    code text not null,
    title text not null,
    description text,
    created_by uuid references users(id),
    created_at timestamptz default now()
);


/* ===============================
   2. COURSE CONTENT (CMS CORE)
   =============================== */
create table if not exists course_contents (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references courses(id) on delete cascade,

    category text not null check (category in ('theory','lab')),
    title text not null,

    week int,
    topic text,
    tags text[],

    content_type text not null check (
        content_type in ('slide','pdf','code','note','image')
    ),

    file_url text not null,      -- Cloudflare R2 URL
    language text,               -- for lab/code

    created_by uuid references users(id),
    created_at timestamptz default now()
);

create index if not exists idx_course_contents_course
on course_contents(course_id);

create index if not exists idx_course_contents_category
on course_contents(category);


/* ===============================
   3. AI-GENERATED LEARNING MATERIALS
   =============================== */
create table if not exists generated_materials (
    id uuid primary key default gen_random_uuid(),

    course_id uuid references courses(id) on delete cascade,
    category text not null check (category in ('theory','lab')),

    prompt text not null,
    output text not null,

    supported_languages text[],
    grounding_score float,

    created_by uuid references users(id),
    created_at timestamptz default now()
);


/* ===============================
   4. VALIDATION & EVALUATION
   =============================== */
create table if not exists validation_reports (
    id uuid primary key default gen_random_uuid(),

    material_id uuid references generated_materials(id) on delete cascade,

    validation_type text not null check (
        validation_type in (
            'syntax',
            'grounding',
            'lint',
            'testcase',
            'ai_review'
        )
    ),

    score float,
    feedback text,
    passed boolean,

    created_at timestamptz default now()
);


/* ===============================
   5. CHAT MEMORY (Botpress-backed)
   =============================== */
create table if not exists chat_sessions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete cascade,
    course_id uuid references courses(id) on delete cascade,

    created_at timestamptz default now()
);

create table if not exists chat_messages (
    id uuid primary key default gen_random_uuid(),

    session_id uuid references chat_sessions(id) on delete cascade,
    role text not null check (role in ('user','assistant','system')),

    content text not null,
    metadata jsonb default '{}'::jsonb,

    created_at timestamptz default now()
);

create index if not exists idx_chat_messages_session
on chat_messages(session_id);


/* ===============================
   6. HANDWRITTEN NOTES DIGITIZATION
   =============================== */
create table if not exists handwritten_notes (
    id uuid primary key default gen_random_uuid(),

    course_id uuid references courses(id),
    original_image_url text not null,
    latex_output text,

    created_by uuid references users(id),
    created_at timestamptz default now()
);


/* ===============================
   7. CONTENT → VIDEO GENERATION
   =============================== */
create table if not exists video_assets (
    id uuid primary key default gen_random_uuid(),

    material_id uuid references generated_materials(id) on delete cascade,
    video_url text not null,
    script text,

    created_at timestamptz default now()
);


/* ===============================
   8. ENABLE RLS
   =============================== */
alter table users enable row level security;
alter table courses enable row level security;
alter table course_contents enable row level security;
alter table generated_materials enable row level security;
alter table validation_reports enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table handwritten_notes enable row level security;
alter table video_assets enable row level security;


/* ===============================
   9. RLS POLICIES (CORE)
   =============================== */

-- Users can read their own profile
create policy "Read own user profile"
on users for select
using (id = auth.uid());

-- Admins manage courses
create policy "Admins manage courses"
on courses
for all
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Everyone can read courses
create policy "Read courses"
on courses for select
using (true);

-- Admin-only content management
create policy "Admins manage course content"
on course_contents
for all
using (
  exists (
    select 1 from users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

-- Students can read content
create policy "Read course content"
on course_contents for select
using (true);

-- Users manage their own generated materials
create policy "Users manage own generated materials"
on generated_materials
for all
using (created_by = auth.uid());

-- Users manage their own chat sessions
create policy "Users manage own chat sessions"
on chat_sessions
for all
using (user_id = auth.uid());

create policy "Users manage own chat messages"
on chat_messages
for all
using (
  exists (
    select 1 from chat_sessions
    where chat_sessions.id = chat_messages.session_id
    and chat_sessions.user_id = auth.uid()
  )
);


/* ===============================
   10. COMMUNITY POSTS
   =============================== */

create table if not exists community_posts (
    id uuid primary key default gen_random_uuid(),

    -- author
    author_id uuid not null references users(id) on delete cascade,

    -- optionally link to a course/context
    course_id uuid references courses(id) on delete set null,

    -- core content
    title text not null,
    body text not null,

    -- simple categorization
    category text check (
        category in ('question', 'discussion', 'announcement')
    ),

    -- visibility (could be extended later)
    visibility text not null default 'course'
        check (visibility in ('course', 'global')),

    -- metadata
    tags text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_community_posts_course
on community_posts(course_id);

create index if not exists idx_community_posts_author
on community_posts(author_id);

/* ===============================
   11. COMMUNITY COMMENTS
   =============================== */

create table if not exists community_comments (
    id uuid primary key default gen_random_uuid(),

    post_id uuid not null references community_posts(id) on delete cascade,

    -- optional parent for threaded replies
    parent_comment_id uuid references community_comments(id) on delete cascade,

    author_id uuid references users(id) on delete set null,

    -- core text
    body text not null,

    -- identify bot vs human and intended receiver
    is_bot boolean not null default false,
    intended_receiver_id uuid references users(id) on delete set null,

    -- helpful for your "bot replies when receiver unavailable" logic
    is_auto_reply boolean not null default false,
    auto_reply_reason text, -- e.g. 'receiver_offline', 'timeout'

    -- grounding info for bot messages
    grounding_metadata jsonb default '{}'::jsonb,

    created_at timestamptz default now()
);

create index if not exists idx_community_comments_post
on community_comments(post_id);

create index if not exists idx_community_comments_parent
on community_comments(parent_comment_id);

create index if not exists idx_community_comments_intended_receiver
on community_comments(intended_receiver_id);

-- RLS policies for community
alter table community_posts enable row level security;
alter table community_comments enable row level security;

-- Anyone can read posts and comments
create policy "Read community posts"
on community_posts for select
using (true);

create policy "Read community comments"
on community_comments for select
using (true);

-- Authenticated users can create posts
create policy "Create community posts"
on community_posts for insert
to authenticated
with check (author_id = auth.uid());

-- Users can update their own posts
create policy "Update own posts"
on community_posts for update
using (author_id = auth.uid());

-- Users can delete their own posts
create policy "Delete own posts"
on community_posts for delete
using (author_id = auth.uid());

-- Authenticated users and bot can create comments
create policy "Create community comments"
on community_comments for insert
to authenticated
with check (author_id = auth.uid() or is_bot = true);

-- Users can update their own comments (bot comments cannot be edited)
create policy "Update own comments"
on community_comments for update
using (author_id = auth.uid() and is_bot = false);

-- Users can delete their own comments
create policy "Delete own comments"
on community_comments for delete
using (author_id = auth.uid() and is_bot = false);

-- Insert system bot user for AI-generated comments
insert into users (id, display_name, role, created_at)
values (
    '00000000-0000-0000-0000-000000000001',
    'AI Assistant',
    'user',
    now()
)
on conflict (id) do nothing;


/* =========================================================
   IMPORTANT NOTES:
   - Existing `documents` table is NOT modified
   - documents.namespace = course_id
   - documents.metadata example:
     {
       "course_id": "...",
       "content_id": "...",
       "category": "lab",
       "week": 5,
       "topic": "AVL Tree",
       "language": "python",
       "chunk_index": 2
     }
   ========================================================= */
