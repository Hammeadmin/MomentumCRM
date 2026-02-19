import React from 'react';
import InvoicePreview from '../InvoicePreview';
import { type InvoiceWithRelations } from '../../lib/invoices';
import { type Organisation } from '../../types/database';

interface PrintableProps {
    invoices: InvoiceWithRelations[];
    organisation: Organisation | null;
    systemSettings: { default_payment_terms: number; logo_url: string | null } | null;
}

const PrintableInvoices = React.forwardRef<HTMLDivElement, PrintableProps>(
    ({ invoices, organisation, systemSettings }, ref) => {
        return (
            <div ref={ref}>
                {invoices.map((invoice) => (
                    <div key={invoice.id} className="printable-page">
                        <InvoicePreview
                            invoice={invoice}
                            logoUrl={organisation?.logo_url || null}
                            systemSettings={systemSettings}
                            organisation={organisation}
                        />
                    </div>
                ))}
            </div>
        );
    }
);

export default PrintableInvoices;
