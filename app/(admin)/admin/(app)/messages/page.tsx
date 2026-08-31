import { supabaseServer } from "@/lib/supabase/server";
import { Inbox, type Message } from "@/components/admin/Inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const db = await supabaseServer();
  const { data } = await db
    .from("inquiries")
    .select("id,name,email,subject,message,created_at,status")
    .order("created_at", { ascending: false })
    .limit(500);

  const messages: Message[] = ((data ?? []) as Array<{
    id: string; name: string; email: string; subject: string | null;
    message: string; created_at: string; status: Message["status"];
  }>).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    createdAt: m.created_at,
    status: m.status,
  }));

  return <Inbox messages={messages} />;
}
