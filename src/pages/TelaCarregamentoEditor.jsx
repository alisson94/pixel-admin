import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  body {
    margin: 0;
    background: #0a0a0a;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1rem;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #27272a;
    border-top-color: #e11d48;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
</head>
<body>
  <div class="spinner"></div>
  <p style="opacity:.6;font-size:.9rem">Redirecionando...</p>
</body>
</html>
`

export function TelaCarregamentoEditor() {
  const { id: accountId, campaignId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [html, setHtml] = useState('')
  const [minSeconds, setMinSeconds] = useState('')
  const [campaignName, setCampaignName] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('name, account_id, loading_screen_html, min_display_seconds')
        .eq('id', campaignId)
        .single()
      if (cancelled) return
      if (error || !data) {
        toast.error(error?.message || 'Campanha não encontrada')
        navigate(`/clientes/${accountId}/campanhas`, { replace: true })
        return
      }
      setCampaignName(data.name ?? '')
      setHtml(data.loading_screen_html ?? '')
      setMinSeconds(data.min_display_seconds == null ? '' : String(data.min_display_seconds))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [accountId, campaignId, navigate])

  async function handleSave() {
    const parsed = minSeconds.trim() === '' ? null : Number(minSeconds.replace(',', '.'))
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error('Tempo mínimo inválido')
      return
    }
    setSaving(true)
    try {
      const value = html.trim() ? html : null
      const { error } = await supabase
        .from('campaigns')
        .update({ loading_screen_html: value, min_display_seconds: parsed })
        .eq('id', campaignId)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Tela de carregamento salva')
    } finally {
      setSaving(false)
    }
  }

  function handleRestoreDefault() {
    setHtml(DEFAULT_HTML)
  }

  function handleClear() {
    setHtml('')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tela de carregamento</h1>
          <p className="text-sm text-foreground/60">
            {campaignName ? `Campanha: ${campaignName}` : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
            <label htmlFor="min-seconds" className="text-xs font-medium text-foreground/80">
              Tempo mínimo (s)
            </label>
            <input
              id="min-seconds"
              type="number"
              min="0"
              step="0.1"
              value={minSeconds}
              onChange={(ev) => setMinSeconds(ev.target.value)}
              placeholder="0"
              className="w-16 rounded border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            />
          </div>
          <Link
            to={`/clientes/${accountId}/campanhas`}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Voltar
          </Link>
          <button
            type="button"
            onClick={handleRestoreDefault}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Restaurar padrão
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Limpar customização
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
            Salvar
          </button>
        </div>
      </div>

      <p className="text-xs text-foreground/60">
        Cole qualquer HTML (com <code className="rounded bg-background px-1">&lt;style&gt;</code>,{' '}
        <code className="rounded bg-background px-1">&lt;script&gt;</code>, imagens, animações).
        Quando o campo estiver vazio, a tela padrão preta com círculo vermelho é usada.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">HTML</label>
          <textarea
            value={html}
            onChange={(ev) => setHtml(ev.target.value)}
            spellCheck={false}
            className="h-[70vh] w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground outline-none ring-primary/30 focus:ring-2"
            placeholder="<!DOCTYPE html>..."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Prévia ao vivo</label>
          <iframe
            srcDoc={html || '<html><body style="margin:0;background:#fff;color:#888;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;font-size:.85rem">Sem HTML personalizado — a tela padrão será usada</body></html>'}
            title="Prévia da tela de carregamento"
            className="h-[70vh] w-full rounded-md border border-border bg-white"
          />
        </div>
      </div>
    </div>
  )
}
