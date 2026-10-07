import type { NativePriest } from "@/content/types/parish";

// Kněží – rodáci kuřimské farnosti, from the old site's page /knezi_rodaci, in its order (by birth). `ordained`
// keeps the old page's "ord. <year> Brno, <place>" wording, as it does not say what the place after the comma is.

const UPLOADS = "/uploads/knezi-rodaci";

export const nativePriests: NativePriest[] = [
  { name: "P. Jan Žaloudek", born: "1842 Kuřim", ordained: "1867 Brno, Bošovice", died: "25. 4. 1879" },
  { name: "P. Jan Konečný", born: "16. 4. 1851", ordained: "1875 Brno, Ruda", died: "13. 12. 1924" },
  { name: "P. Alois Konečný", born: "3. 6. 1858", ordained: "1882 Brno, Těšetice", died: "3. 12. 1912" },
  { name: "P. Cyril Studený", born: "5. 7. 1868", ordained: "1895 Brno, Pravlov", died: "2. 7. 1962" },
  { name: "P. Kasián Veselý", born: "12. 8. 1876", ordained: "1901 Brno, Polsko", died: "28. 12. 1932" },
  { name: "P. Jan Širůček", born: "6. 6. 1880", ordained: "1905 Brno, Trstenice", died: "23. 3. 1950" },
  {
    name: "P. Václav Večeřa",
    born: "12. 9. 1915",
    ordained: "1940 Brno",
    died: "29. 3. 1987, pohřben v Moravských Knínicích",
  },
  {
    name: "P. František Šrámek",
    born: "1. 12. 1920",
    ordained: "1946 Brno",
    died: "22. 6. 2009 v Žernůvce, pohřben ve Veverské Bítýšce",
  },
  { name: "P. Josef Böhm", born: "16. 7. 1922", died: "26. 12. 1999" },
  { name: "ThDr. Dušan Hladík", born: "9. 4. 1959", ordained: "26. 6. 1983 Brno", note: "t. č. Chicago" },
  { name: "P. Pavel Merta", born: "14. 9. 1966", ordained: "1997 Brno, Miroslav" },
  { name: "P. Michael Macek", born: "24. 11. 1970", ordained: "1998 Brno, Rousínov u Vyškova" },
  {
    name: "Mons. Jiří Krpálek, O.Melit.",
    html: `
      <p>V sobotu 12. srpna 2017 v 10 hodin jsme se s ním rozloučili v kostele sv. Maří Magdalény v Kuřimi. <a href="${UPLOADS}/krpalek-rozlouceni-2017.pdf">Více informací (PDF)</a> · <a href="https://www.youtube.com/watch?v=lRdH-od2VeY">Záznam rozloučení na YouTube</a></p>
      <p>Otci Krpálkovi je věnované číslo <a href="/uploads/petrklic/2017-3/petrklic-2017-3.pdf">Petrklíč 3/2017 (PDF)</a>.</p>
      <p>V neděli 1. 10. 2017 v 9.00 v Kuřimi a ve 12.00 v Moravských Knínicích proběhlo promítání věnované otci Krpálkovi. <a href="https://www.youtube.com/watch?v=M9A90K6RWBY">Záznam promítání na YouTube</a></p>`,
  },
];
