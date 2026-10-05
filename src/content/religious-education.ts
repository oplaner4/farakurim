import type { ReligiousEducation } from "./types/activities";

const UPLOADS = "/uploads/vyuka-nabozenstvi";

/* Výuka náboženství (design/DESIGN.md §24), from the old site's /vyuka_nabozenstvi. Update each September. */
export const religiousEducation: ReligiousEducation = {
  schoolYear: "2026/2027",
  schools: [
    {
      id: "tyrsova",
      name: "ZŠ Tyršova",
      rows: [
        {
          grade: "1.–2.",
          day: "pátek",
          time: "12:15–13:00",
          room: "učebna 1.B (budova Komenského)",
          teacher: "Mgr. Eva Fialová",
        },
        { grade: "3.", day: "středa", time: "13:00–13:45", room: "učebna 113 (přízemí)", teacher: "P. Jaroslav Filka" },
        {
          grade: "4.–5.",
          day: "úterý",
          time: "13:00–13:35",
          room: "učebna 113 (přízemí)",
          teacher: "Mgr. Ludmila Císařová",
        },
      ],
    },
    {
      id: "jungmannova",
      name: "ZŠ Jungmannova",
      rows: [
        { grade: "1.–5.", day: "středa", time: "7:00–7:45", room: "jazyková učebna", teacher: "P. Jaroslav Filka" },
      ],
    },
    {
      id: "moravske-kninice",
      name: "Moravské Knínice",
      rows: [
        {
          grade: "1.–5.",
          day: "pátek",
          time: "podle rozpisu skupin",
          room: "ZŠ Moravské Knínice",
          teacher: "Mgr. Ludmila Císařová",
        },
      ],
    },
    {
      id: "fara",
      name: "Fara Kuřim",
      rows: [
        {
          grade: "6.–9. (1. skupina)",
          day: "středa",
          time: "16:30–17:30",
          room: "farní klubovna",
          teacher: "P. Jaroslav Filka",
        },
        {
          grade: "6.–9. (2. skupina)",
          day: "pátek",
          time: "15:00–16:00",
          room: "farní klubovna",
          teacher: "P. Jaroslav Filka",
        },
      ],
    },
  ],
  applicationForm: `${UPLOADS}/prihlaska-do-nabozenstvi.jpg`,
  rules: `${UPLOADS}/zasady-vyuky-nabozenstvi.pdf`,
  contact: {
    name: "Hanka Prokopová",
    role: "pastorační asistentka",
    phone: "736 529 285",
    phoneNote: "jen v naléhavých případech",
    email: "prokopovahanka@seznam.cz",
  },
};
