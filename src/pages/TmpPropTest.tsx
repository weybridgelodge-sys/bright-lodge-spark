import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const rows = [
  { id: "1", item: "Master's chair", count: 1, value_pence: 125000, condition: "Good", date_acquired: "1949-10-01", location: "Lodge Room", notes: "" },
];
const canEdit = true;
const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export default function TmpPropTest() {
  return (
    <div className="min-h-screen bg-navy text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden lg:block" />
        <main className="pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] lg:pb-0">
          <Tabs value="property">
            <TabsList className="flex flex-col w-full h-auto items-stretch gap-1 bg-navy p-2 rounded-sm border border-gold/20 mb-4">
              <TabsTrigger value="property" className="w-full flex items-center justify-start gap-3 px-4 py-3">Property Register</TabsTrigger>
            </TabsList>
            <TabsContent value="property" className="mt-4">
              <div className="space-y-4" id="tabroot">
                <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4" id="card">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="font-serif text-lg text-gold">Lodge Property Register</h2>
                      <p className="text-primary-foreground/60 text-sm">Audit of lodge property.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto" id="scroller">
                    <table className="w-full text-sm" id="tbl">
                      <thead>
                        <tr className="text-left text-primary-foreground/60 border-b border-gold/20">
                          <th className="py-2">Item</th>
                          <th className="py-2 text-right">Count</th>
                          <th className="py-2">Location</th>
                          <th className="py-2 text-right">Value</th>
                          <th className="py-2">Condition</th>
                          <th className="py-2">Date acquired</th>
                          <th className="py-2">Notes</th>
                          {canEdit && <th className="py-2 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-b border-gold/10 align-top">
                            <td className="py-2">{r.item}</td>
                            <td className="py-2 text-right">{r.count}</td>
                            <td className="py-2">{r.location}</td>
                            <td className="py-2 text-right">{money(r.value_pence)}</td>
                            <td className="py-2">{r.condition}</td>
                            <td className="py-2">{r.date_acquired}</td>
                            <td className="py-2 whitespace-pre-wrap">{r.notes}</td>
                            {canEdit && <td className="py-2 text-right">…</td>}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gold/30">
                          <td className="py-3 font-semibold" colSpan={2}>Total estimated value</td>
                          <td className="py-3 text-right text-gold font-semibold">{money(125000)}</td>
                          <td className="py-3" colSpan={canEdit ? 5 : 4}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
