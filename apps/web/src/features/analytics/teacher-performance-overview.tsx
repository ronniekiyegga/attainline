"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { CalendarEvent } from "@/features/calendar/calendar.schema";
import { createCalendarEventAction, deleteCalendarEventAction, listCalendarEventsAction } from "@/features/calendar/calendar.actions";
import type { AnalyticsOverview } from "./analytics.schema";

function monthRange(date: Date) {
  return {
    from: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    to: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)),
  };
}

function calendarDays(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstDay = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1) return { day: previousMonthDays + day, muted: true };
    if (day > daysInMonth) return { day: day - daysInMonth, muted: true };
    return { day, muted: false };
  });
}

function dateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EventCard({ event, onRemove, pending }: { event: CalendarEvent; onRemove: () => void; pending: boolean }) {
  const startsAt = new Date(event.startsAt);
  return (
    <article className="rounded-[0.77075rem] border-2 border-white bg-[#fafafa] px-4 py-3 shadow-[4.21px_16.84px_33.68px_0_rgba(219,220,230,0.50)]">
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-2"><span className="size-1.5 rounded-full bg-[#600bea] shadow-[0_1px_6px_rgba(1,1,251,0.40)]" /><span className="flex size-8 items-center justify-center rounded-full bg-white shadow-[4.111px_10.277px_34.839px_rgba(12,18,36,0.16)]"><Clock3 aria-hidden className="size-3.5" /></span></div>
        <div className="min-w-0 flex-1"><h4 className="truncate text-[10px] font-semibold text-gray-900">{event.title}</h4><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">{event.description || "Calendar event"}</p><p className="mt-1 text-[9px] font-medium text-[#600bea]">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(startsAt)}{event.yearGroup ? ` · Year ${event.yearGroup}` : " · Whole school"}</p></div>
        <button type="button" onClick={onRemove} disabled={pending} aria-label={`Remove ${event.title}`} className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea] disabled:opacity-50"><Trash2 aria-hidden className="size-3.5" /></button>
      </div>
    </article>
  );
}

function AddEventDialog({ visibleYearGroups, selectedDate, onSaved }: { visibleYearGroups: number[] | null; selectedDate: Date; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const start = new Date(selectedDate);
  start.setHours(15, 30, 0, 0);
  const end = new Date(start.getTime() + 45 * 60_000);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) setMessage(undefined); }}>
      <Dialog.Trigger asChild><button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(110deg,#3e7bfa,#600bea)] px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#600bea]"><Plus aria-hidden className="size-3" />Add event</button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#090c18]/60 backdrop-blur-[2px]" />
        <Dialog.Content aria-describedby="calendar-dialog-description" className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-[0_30px_90px_rgba(17,20,43,0.32)] focus:outline-none">
          <div className="flex items-start justify-between"><div><Dialog.Title className="text-xl font-semibold text-[#23223c]">Create calendar event</Dialog.Title><Dialog.Description id="calendar-dialog-description" className="mt-1 text-sm text-gray-500">Events are visible only within the active school and permitted year groups.</Dialog.Description></div><Dialog.Close aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"><X aria-hidden className="size-4" /></Dialog.Close></div>
          <form className="mt-6 space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setMessage(undefined);
            startTransition(async () => {
              const result = await createCalendarEventAction({
                title: String(data.get("title") ?? ""),
                description: String(data.get("description") ?? ""),
                startsAt: new Date(String(data.get("startsAt"))).toISOString(),
                endsAt: new Date(String(data.get("endsAt"))).toISOString(),
                ...(data.get("yearGroup") ? { yearGroup: Number(data.get("yearGroup")) } : {}),
              });
              if (result.status === "success") { await onSaved(); setOpen(false); }
              else setMessage(result.message);
            });
          }}>
            <label className="block text-xs font-semibold text-gray-700">Title<input name="title" required maxLength={120} className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#600bea]" /></label>
            <label className="block text-xs font-semibold text-gray-700">Notes<textarea name="description" maxLength={500} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#600bea]" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-gray-700">Starts<input name="startsAt" type="datetime-local" required defaultValue={dateTimeLocal(start)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#600bea]" /></label><label className="block text-xs font-semibold text-gray-700">Ends<input name="endsAt" type="datetime-local" required defaultValue={dateTimeLocal(end)} className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#600bea]" /></label></div>
            <label className="block text-xs font-semibold text-gray-700">Audience<select name="yearGroup" required={visibleYearGroups !== null} defaultValue={visibleYearGroups?.[0] ?? ""} className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#600bea]">{visibleYearGroups === null ? <option value="">Whole school</option> : null}{(visibleYearGroups ?? []).map((yearGroup) => <option key={yearGroup} value={yearGroup}>Year {yearGroup}</option>)}</select></label>
            {message ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p> : null}
            <button type="submit" disabled={pending} className="h-11 w-full rounded-full bg-[linear-gradient(110deg,#3e7bfa,#600bea)] text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save event"}</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TeacherPerformanceOverview({ overview, initialEvents, visibleYearGroups }: { overview: AnalyticsOverview; initialEvents: CalendarEvent[]; visibleYearGroups: number[] | null }) {
  const initialMonth = new Date(Date.UTC(overview.academicYearStart, 9, 1));
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(25);
  const [events, setEvents] = useState(initialEvents);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const days = useMemo(() => calendarDays(month), [month]);
  const selectedDate = new Date(month); selectedDate.setUTCDate(selectedDay);
  const visibleEvents = events.filter((event) => new Date(event.startsAt).getUTCMonth() === month.getUTCMonth() && new Date(event.startsAt).getUTCFullYear() === month.getUTCFullYear());

  async function refresh(nextMonth = month) {
    const range = monthRange(nextMonth);
    const result = await listCalendarEventsAction(range.from.toISOString(), range.to.toISOString());
    if (result) { setEvents(result.items); setMessage(undefined); router.refresh(); }
    else setMessage("Calendar events could not be loaded.");
  }

  function navigate(offset: number) {
    const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
    setMonth(next); setSelectedDay(1); setMessage(undefined);
    startTransition(() => refresh(next));
  }

  return (
    <section className="flex min-h-[650px] w-full flex-col bg-[#fcfcfc]" aria-labelledby="teacher-performance-title">
      <div className="mb-1 flex items-center justify-between border-b-2 border-[#f2f3f7cd] px-4 py-2"><h2 id="teacher-performance-title" className="text-xs font-semibold text-gray-900">PERFORMANCE OVERVIEW</h2><AddEventDialog visibleYearGroups={visibleYearGroups} selectedDate={selectedDate} onSaved={() => refresh()} /></div>
      <div className="grid min-h-[350px] gap-6 px-4 py-4 md:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0"><h3 className="text-base font-bold text-gray-900">Your Next Meeting</h3><p className="mt-2 max-w-md text-xs leading-5 text-gray-500">Your school calendar and assessment review schedule.</p><p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-[#600bea]">Upcoming events</p><div className="mt-3 space-y-3">{visibleEvents.length ? visibleEvents.slice(0, 3).map((event) => <EventCard key={event.id} event={event} pending={pending} onRemove={() => startTransition(async () => { const result = await deleteCalendarEventAction(event.id); if (result.status === "success") await refresh(); else setMessage(result.message); })} />) : <div className="rounded-2xl border border-dashed border-[#ded9ee] bg-white px-4 py-8 text-center"><CalendarDays aria-hidden className="mx-auto size-5 text-[#600bea]" /><p className="mt-2 text-xs font-semibold text-gray-800">No events this month</p><p className="mt-1 text-[10px] text-gray-500">Choose a date and add the first event.</p></div>}{message ? <p role="alert" className="text-xs text-red-700">{message}</p> : null}</div></div>
        <div className="relative rounded-[0.69656rem] bg-white px-3 py-3 shadow-[7.06px_17.65px_28.24px_7.06px_rgba(219,220,230,0.20)]" aria-busy={pending}>
          <div className="flex items-center justify-between"><button type="button" onClick={() => navigate(-1)} aria-label="Previous month" className="flex size-8 items-center justify-center rounded-full hover:bg-gray-50"><ChevronLeft aria-hidden className="size-4" /></button><p className="text-xs font-semibold text-gray-900">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(month)}</p><button type="button" onClick={() => navigate(1)} aria-label="Next month" className="flex size-8 items-center justify-center rounded-full hover:bg-gray-50"><ChevronRight aria-hidden className="size-4" /></button></div>
          <div className="mt-3 grid grid-cols-7 text-center text-[9px] font-semibold text-gray-500">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px]">{days.map(({ day, muted }, index) => <button key={`${day}-${index}`} type="button" disabled={muted} onClick={() => setSelectedDay(day)} aria-label={muted ? undefined : `${day} ${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(month)}`} className={`mx-auto flex size-8 items-center justify-center rounded-full ${muted ? "text-gray-300" : "font-medium text-gray-700 hover:bg-violet-50"} ${day === selectedDay && !muted ? "border border-sky-300 text-[#600bea] shadow-sm" : ""}`}>{day}</button>)}</div>
          <div className="mt-3 rounded-xl border border-[#e8e4f4] bg-[#fbfaff] p-3 text-[9px] text-[#7c82a1]"><p className="font-semibold text-[#23223c]">{visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"} in this month</p><p className="mt-1 leading-4">Calendar entries are saved to the active school and restricted by role scope.</p></div>
        </div>
      </div>
      <div className="mt-4 border-t border-[#f2f3f7] bg-white px-5 py-5"><h3 className="text-xs font-medium text-gray-700">Schedule</h3>{visibleEvents[0] ? <div className="relative mt-3 py-3 pl-5"><span className="absolute inset-y-0 left-0 w-[1.6px] bg-[linear-gradient(87deg,#9cecfb,#0a40ff)]" /><p className="text-[10px] text-gray-400">{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(visibleEvents[0].startsAt))}</p><p className="mt-1 text-xs font-semibold text-gray-800">{visibleEvents[0].title}</p><span className="mt-2 inline-flex rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-600">Scheduled</span></div> : <p className="mt-3 text-xs text-gray-500">No scheduled events for this month.</p>}</div>
    </section>
  );
}
