'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { DemoRecord, Medicine, Persona, Mapping } from '@/contracts';
import { initialRecords, initialMappings, medicines as initialMedicines } from './fixtures';
const Context = createContext<null | {
  mappings: Mapping[];
  setMappings: React.Dispatch<React.SetStateAction<Mapping[]>>;
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  records: Record<string, DemoRecord[]>;
  setRecords: React.Dispatch<React.SetStateAction<Record<string, DemoRecord[]>>>;
  persona: Persona;
  setPersona: (p: Persona) => void;
  notice: string;
  notify: (s: string) => void;
  reset: () => void;
}>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [mappings, setMappings] = useState(initialMappings);
  const [medicines, setMedicines] = useState(initialMedicines);
  const [records, setRecords] = useState(initialRecords);
  const [persona, setPersona] = useState<Persona>('Administrator');
  const [notice, setNotice] = useState('');
  function notify(s: string) {
    setNotice(s);
    setTimeout(() => setNotice(''), 5000);
  }
  return (
    <Context.Provider
      value={{
        mappings,
        setMappings,
        medicines,
        setMedicines,
        records,
        setRecords,
        persona,
        setPersona,
        notice,
        notify,
        reset: () => {
          setMappings(initialMappings);
          setMedicines(initialMedicines);
          setRecords(initialRecords);
          notify('Demo data reset.');
        },
      }}
    >
      {children}
      {notice && (
        <div role="status" className="toast">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const c = useContext(Context);
  if (!c) throw Error('Demo provider missing');
  return c;
}
