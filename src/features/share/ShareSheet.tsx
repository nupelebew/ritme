import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Brain, ListPlus } from 'lucide-react'
import { Button, Field, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { useCategories } from '@/db/hooks'
import { addTask } from '@/db/tasks'
import { shiftKey, todayKey } from '@/lib/date'
import { parseQuickAdd } from '@/lib/quickAdd'
import { readShared, sharedLines } from '@/lib/share'

/** Muncul saat teks dibagikan dari aplikasi lain ke Ritme (Android, aplikasi terpasang) */
export function ShareSheet() {
  const [text, setText] = useState(() => readShared(window.location.search))
  const { list: categories } = useCategories()
  const toast = useToast()
  const navigate = useNavigate()
  if (text === null) return null

  const close = () => {
    // buang ?title=&text= dari URL, pertahankan rute (#/…)
    history.replaceState(null, '', window.location.pathname + window.location.hash)
    setText(null)
  }
  const today = todayKey()
  const lines = sharedLines(text)

  const toTasks = async () => {
    for (const line of lines) {
      const p = parseQuickAdd(line, today, categories)
      if (!p.title) continue
      await addTask({ title: p.title, categoryId: p.categoryId ?? categories[0]?.id ?? 'skripsi', priority: p.priority ?? 2, due: p.due, estimateMin: p.estimateMin })
    }
    toast({ text: lines.length > 1 ? `${lines.length} tugas ditambahkan.` : 'Tugas ditambahkan.', tone: 'success' })
    close()
    navigate('/tugas')
  }

  const toBrainDump = async () => {
    const date = shiftKey(today, 1)
    await db.transaction('rw', db.days, async () => {
      const cur = await db.days.get(date)
      const prev = cur?.brainDump?.trim()
      await db.days.put({ ...(cur ?? { date }), brainDump: [prev, ...lines.map((l) => `- ${l}`)].filter(Boolean).join('\n') })
    })
    toast({ text: 'Masuk ke brain dump besok.', tone: 'success' })
    close()
    navigate('/rencana')
  }

  return (
    <Sheet
      open
      onClose={close}
      title="Simpan ke Ritme"
      footer={
        <>
          <Button icon={Brain} onClick={toBrainDump} disabled={!lines.length}>
            Brain dump besok
          </Button>
          <Button variant="primary" icon={ListPlus} className="flex-1" onClick={toTasks} disabled={!lines.length}>
            {lines.length > 1 ? `Jadikan ${lines.length} tugas` : 'Jadikan tugas'}
          </Button>
        </>
      }
    >
      <Field label="Teks yang dibagikan" hint="Satu baris = satu tugas. Format cepat tetap jalan, mis. “besok !3 #freelance 30m”.">
        <textarea className="field min-h-32 resize-y text-sm" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Sheet>
  )
}
