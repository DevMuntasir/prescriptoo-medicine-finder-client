'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/primitives';
import { api, json } from '@/lib/api';

type PrintJob = { id: string; status: string; file_id?: string };

export function QRCardPreview({ qrId, onClose }: { qrId: string; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [pdf, setPdf] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    const options = { signal: controller.signal };

    async function check(job: PrintJob) {
      if (controller.signal.aborted) return;
      if (job.status === 'failed') throw new Error('Card generation failed. Please try again.');
      if (job.status === 'complete') {
        if (!job.file_id) throw new Error('The generated card is unavailable. Please try again.');
        const response = await fetch(`/api/v1/admin/files/${job.file_id}`, {
          ...options,
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Could not load the card. Please try again.');
        const blob = await response.blob();
        if (!blob.type.includes('application/pdf')) throw new Error('The card PDF is unavailable.');
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPdf(objectUrl);
        return;
      }
      if (Date.now() - started > 120_000)
        throw new Error(
          'Card generation is taking longer than expected. Please try again shortly.',
        );
      timer = setTimeout(() => {
        void api<PrintJob>(`admin/jobs/${job.id}`, options).then(check).catch(fail);
      }, 1500);
    }

    function fail(reason: Error) {
      if (!controller.signal.aborted) setError(reason.message);
    }

    void api<PrintJob>('admin/qrs/print', {
      ...options,
      method: 'POST',
      body: json({ qrIds: [qrId], format: 'card' }),
    })
      .then(check)
      .catch(fail);

    return () => {
      controller.abort();
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [qrId, attempt]);

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title="QR card preview">
      <div className="qr-card-preview">
        <p className="muted small">
          Actual print layout · 90 × 50 mm. This preview uses the same PDF as the printed card.
        </p>
        {error ? (
          <div role="alert" className="warning">
            <p>{error}</p>
            <button
              className="button button-outline"
              onClick={() => {
                setError('');
                setPdf('');
                setAttempt((value) => value + 1);
              }}
            >
              Retry preview
            </button>
          </div>
        ) : pdf ? (
          <>
            <iframe title="Actual QR card" src={`${pdf}#toolbar=0&navpanes=0&view=FitH`} />
            <div className="live-admin-tools">
              <a className="button" href={pdf} download={`qr-card-${qrId}.pdf`}>
                Download card PDF
              </a>
              <a className="button button-outline" href={pdf} target="_blank" rel="noreferrer">
                Open / print card
              </a>
            </div>
            <p className="small muted">
              If the preview is not visible in your browser, open or download the PDF.
            </p>
          </>
        ) : (
          <p role="status" className="empty">
            Preparing your card preview…
          </p>
        )}
      </div>
    </Modal>
  );
}
