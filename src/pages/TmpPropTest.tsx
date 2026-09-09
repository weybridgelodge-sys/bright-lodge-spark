import { useEffect } from "react";
import { buildPropertyRegisterPdf } from "@/components/members/treasurer/PropertyRegisterTab";

const rows = [
  { id: "1", item: "Fellowcraft aprons", count: 6, value_pence: 12000, condition: "Fair", date_acquired: null, location: "Locker", notes: null },
  { id: "2", item: "Wooden squares", count: 2, value_pence: 4000, condition: "Good", date_acquired: "2019-05-04", location: "Locker", notes: null },
];

export default function TmpPropTest() {
  useEffect(() => {
    (async () => {
      const doc = await buildPropertyRegisterPdf(rows as any, 16000);
      (window as any).__pdf = doc.output("datauristring");
    })();
  }, []);
  return <div id="ready">PDF harness</div>;
}
