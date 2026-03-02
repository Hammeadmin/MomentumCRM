import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Calculator,
  Shield,
  Clock,
  User,
  Users,
  Loader2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import {
  getQuoteByToken,
  acceptQuoteWithROT,
  acceptQuoteSimple,
  validateSwedishPersonnummer,
  formatSwedishPersonnummer,
  calculateROTAmount,
  formatROTAmount,
  getROTExplanationText,
  type ROTFormData
} from '../lib/rot';
import {
  calculateRUTAmount,
  formatRUTAmount,
  getRUTExplanationText,
  validateSwedishPersonnummer as validateRUTPersonnummer,
  formatSwedishPersonnummer as formatRUTPersonnummer,
} from '../lib/rut';
import { formatCurrency, formatDate } from '../lib/database';
import { supabase } from '../lib/supabase';


function QuoteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [rotData, setRotData] = useState<ROTFormData>({
    type: 'person',
    identifier: '',
    fastighetsbeteckning: ''
  });
  const [rutPersonnummer, setRutPersonnummer] = useState('');

  useEffect(() => {
    if (token) {
      loadQuote();
      trackQuoteView(token);
    }
  }, [token]);

  const trackQuoteView = async (viewToken: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const trackingUrl = `${supabaseUrl}/functions/v1/track-quote-view?token=${encodeURIComponent(viewToken)}`;
      await fetch(trackingUrl, { mode: 'no-cors' });
      console.log('Quote view tracked');
    } catch (err) {
      console.error('Failed to track quote view:', err);
    }
  };

  const loadQuote = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getQuoteByToken(token);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data) {
        setError('Offerten hittades inte eller har gått ut.');
        return;
      }

      setQuote(result.data);
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Ett oväntat fel inträffade vid laddning av offerten.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!token || !quote) return;

    // Validation for ROT quotes
    if (quote.include_rot) {
      if (rotData.identifier && !validateSwedishPersonnummer(rotData.identifier)) {
        setError('Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX');
        return;
      }

      // Only require fastighetsbeteckning if personnummer is provided
      if (rotData.identifier && !rotData.fastighetsbeteckning.trim()) {
        setError('Vänligen ange fastighetsbeteckning för att använda ROT-avdrag.');
        return;
      }
    }

    try {
      setAccepting(true);
      setError(null);

      let result;

      // Use simple acceptance for non-ROT or quotes where ROT fields are empty
      if (!quote.include_rot || (!rotData.identifier && !rotData.fastighetsbeteckning)) {
        result = await acceptQuoteSimple(token, await getClientIP());
      } else {
        result = await acceptQuoteWithROT({
          token,
          rot_data: {
            type: 'person',
            identifier: rotData.identifier,
            fastighetsbeteckning: rotData.fastighetsbeteckning
          },
          client_ip: await getClientIP()
        });
      }

      // If RUT personnummer was provided, update the quote with it
      if (quote.include_rut && rutPersonnummer) {
        await supabase
          .from('quotes')
          .update({ rut_personnummer: rutPersonnummer })
          .eq('acceptance_token', token);
      }

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Send acceptance notification to organisation (email)
      if (quote?.organisation?.email) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: quote.organisation.email,
              subject: `✅ Offert ${quote.quote_number} har godkänts!`,
              html: generateAcceptanceNotificationEmail(quote, rotData, rutPersonnummer),
              from_name: 'MomentumCRM'
            }
          });
          console.log('Acceptance notification sent to', quote.organisation.email);
        } catch (notifyErr) {
          console.error('Failed to send acceptance notification:', notifyErr);
        }
      }

      // Create in-app notification
      try {
        await supabase.functions.invoke('notify-quote-event', {
          body: {
            quote_id: quote.id,
            event_type: 'quote_accepted',
            metadata: {
              customer_name: quote.customer?.name
            }
          }
        });
        console.log('In-app notification created');
      } catch (notifyErr) {
        console.error('Failed to create in-app notification:', notifyErr);
      }

      setAccepted(true);
    } catch (err) {
      console.error('Error accepting quote:', err);
      setError('Ett oväntat fel inträffade vid godkännande av offerten.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineQuote = async () => {
    if (!token || !quote) return;

    try {
      setDeclining(true);
      setError(null);

      // Update quote status to declined
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'declined'
        })
        .eq('acceptance_token', token);

      if (updateError) {
        setError('Kunde inte avvisa offerten.');
        return;
      }

      // Send decline notification email to organisation
      if (quote?.organisation?.email) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: quote.organisation.email,
              subject: `❌ Offert ${quote.quote_number} har avvisats`,
              html: generateDeclineNotificationEmail(quote, declineReason),
              from_name: 'MomentumCRM'
            }
          });
        } catch (notifyErr) {
          console.error('Failed to send decline notification:', notifyErr);
        }
      }

      // Create in-app notification
      try {
        await supabase.functions.invoke('notify-quote-event', {
          body: {
            quote_id: quote.id,
            event_type: 'quote_declined',
            metadata: {
              customer_name: quote.customer?.name,
              decline_reason: declineReason || undefined
            }
          }
        });
      } catch (notifyErr) {
        console.error('Failed to create in-app notification:', notifyErr);
      }

      setDeclined(true);
    } catch (err) {
      console.error('Error declining quote:', err);
      setError('Ett oväntat fel inträffade.');
    } finally {
      setDeclining(false);
    }
  };

  // Generate decline notification email
  const generateDeclineNotificationEmail = (quoteData: any, reason: string) => {
    const customerName = quoteData?.customer?.name || 'Kund';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Offert avvisad</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">❌ Offert avvisad</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; margin-bottom: 20px;"><strong>${customerName}</strong> har valt att avvisa offert <strong>${quoteData?.quote_number}</strong>.</p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #991b1b;">Offertinformation:</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Titel:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${quoteData?.title}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Belopp:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${formatCurrency(quoteData?.total_amount || 0)}</td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Skäl:</td>
                  <td style="padding: 5px 0;">${reason}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="margin: 20px 0; color: #6b7280;">Kontakta kunden för att diskutera alternativa lösningar eller få mer feedback.</p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">Detta är en automatisk notifiering från MomentumCRM.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate notification email for organisation
  const generateAcceptanceNotificationEmail = (quoteData: any, rotInfo: ROTFormData, rutPnr: string) => {
    const customerName = quoteData?.customer?.name || 'Kund';
    const quoteAmount = formatCurrency(quoteData?.total_amount || 0);
    const rotAmount = quoteData?.include_rot ? formatCurrency(calculateROTAmount(quoteData?.total_amount || 0)) : null;
    const rutAmount = quoteData?.include_rut ? formatCurrency(calculateRUTAmount(quoteData?.total_amount || 0)) : null;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Offert godkänd</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Offert godkänd!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; margin-bottom: 20px;">Fantastiska nyheter! <strong>${customerName}</strong> har just godkänt offert <strong>${quoteData?.quote_number}</strong>.</p>
            
            <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #166534;">Offertdetaljer:</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Titel:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${quoteData?.title}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Belopp:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${quoteAmount}</td>
                </tr>
                ${rotAmount ? `
                <tr>
                  <td style="padding: 5px 0; color: #059669;">ROT-avdrag:</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #059669;">-${rotAmount}</td>
                </tr>
                ` : ''}
                ${rutAmount ? `
                <tr>
                  <td style="padding: 5px 0; color: #7c3aed;">RUT-avdrag:</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #7c3aed;">-${rutAmount}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Kund:</td>
                  <td style="padding: 5px 0;">${customerName}</td>
                </tr>
                ${quoteData?.customer?.email ? `
                <tr>
                  <td style="padding: 5px 0; color: #374151;">E-post:</td>
                  <td style="padding: 5px 0;">${quoteData.customer.email}</td>
                </tr>
                ` : ''}
                ${quoteData?.customer?.phone_number ? `
                <tr>
                  <td style="padding: 5px 0; color: #374151;">Telefon:</td>
                  <td style="padding: 5px 0;">${quoteData.customer.phone_number}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="margin: 20px 0; color: #6b7280;">En ny order har automatiskt skapats baserat på den godkända offerten. Logga in för att se detaljer och planera nästa steg.</p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">Detta är en automatisk notifiering från MomentumCRM.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const calculateSubtotal = () => {
    return (quote?.quote_line_items || []).reduce((sum: number, item: any) => sum + item.total, 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.25; // 25% VAT
  };

  const calculateROTDeduction = () => {
    return quote?.include_rot ? calculateROTAmount(quote.total_amount) : 0;
  };

  const calculateRUTDeduction = () => {
    return quote?.include_rut ? calculateRUTAmount(quote.total_amount) : 0;
  };

  const calculateFinalAmount = () => {
    return quote?.total_amount - calculateROTDeduction() - calculateRUTDeduction();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Laddar offert...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Offert ej tillgänglig</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              Kontakta företaget direkt om du har frågor om din offert.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Tack!</h1>
            <p className="text-xl text-gray-700 mb-6">Din offert är nu godkänd.</p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">Vad händer nu?</h3>
              <ul className="text-sm text-green-800 space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Vi har mottagit ditt godkännande och kommer att kontakta dig inom 24 timmar</span>
                </li>
                <li className="flex items-start">
                  <Calendar className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Vi kommer att schemalägga arbetet enligt överenskommelse</span>
                </li>
                {quote?.include_rot && calculateROTDeduction() > 0 && (
                  <li className="flex items-start">
                    <Calculator className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>ROT-avdraget på {formatROTAmount(calculateROTDeduction())} kommer att dras av från fakturan</span>
                  </li>
                )}
                {quote?.include_rut && calculateRUTDeduction() > 0 && (
                  <li className="flex items-start">
                    <Calculator className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>RUT-avdraget på {formatRUTAmount(calculateRUTDeduction())} kommer att dras av från fakturan</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              <p>Referensnummer: {quote?.quote_number}</p>
              <p>Godkänt: {new Date().toLocaleDateString('sv-SE')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Offert avvisad</h1>
            <p className="text-xl text-gray-700 mb-6">Du har valt att avvisa denna offert.</p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-600">
                Vi har meddelat {quote?.organisation?.name || 'företaget'} om ditt beslut.
                Om du ändrar dig eller vill diskutera alternativ, kontakta dem gärna direkt.
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <p>Referensnummer: {quote?.quote_number}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {quote?.organisation?.name || 'Momentum CRM'}
                </h1>
                <p className="text-gray-600">Offertgodkännande</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Offert</p>
              <p className="text-lg font-bold text-gray-900">{quote?.quote_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quote Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Information */}
            <div className="card-padded">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{quote?.title}</h2>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Giltig till</p>
                  <p className="font-medium text-gray-900">
                    {quote?.valid_until ? formatDate(quote.valid_until) : 'Enligt överenskommelse'}
                  </p>
                </div>
              </div>

              {quote?.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Beskrivning</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
                </div>
              )}

              {/* Line Items */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-4">Offertspecifikation</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Beskrivning</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Antal</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">À-pris</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(quote?.quote_line_items || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Moms (25%):</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculateVAT())}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
                      <span>Totalt:</span>
                      <span>{formatCurrency(quote?.total_amount || 0)}</span>
                    </div>

                    {/* ROT Deduction */}
                    {quote?.include_rot && calculateROTDeduction() > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-green-600 border-t border-green-200 pt-2">
                          <span>ROT-avdrag (50%):</span>
                          <span className="font-medium">-{formatROTAmount(calculateROTDeduction())}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-green-700 border-t border-green-300 pt-2">
                          <span>Att betala efter ROT:</span>
                          <span>{formatROTAmount(calculateFinalAmount())}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ROT Information */}
            {quote?.include_rot && (
              <div className="card-padded">
                <div className="flex items-center mb-4">
                  <Calculator className="w-6 h-6 text-green-600 mr-3" />
                  <h3 className="text-lg font-bold text-gray-900">ROT-avdrag</h3>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800 leading-relaxed">
                    {getROTExplanationText()}
                  </p>
                  <p className="text-sm text-green-700 mt-2 font-medium">
                    Uppskattad ROT-avdrag: {formatROTAmount(calculateROTDeduction())}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Vill du använda ROT-avdrag?</strong> Fyll i ditt personnummer och fastighetsbeteckning nedan.
                    Om du inte vill använda ROT-avdrag kan du lämna fälten tomma och bara godkänna offerten.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personnummer <span className="text-gray-400 font-normal">(valfritt)</span>
                    </label>
                    <input
                      type="text"
                      value={rotData.identifier}
                      onChange={(e) => {
                        const formatted = e.target.value.length >= 10
                          ? formatSwedishPersonnummer(e.target.value)
                          : e.target.value;
                        setRotData(prev => ({ ...prev, identifier: formatted }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${rotData.identifier && !validateSwedishPersonnummer(rotData.identifier)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                        }`}
                      placeholder="YYYYMMDD-XXXX"
                    />
                    {rotData.identifier && !validateSwedishPersonnummer(rotData.identifier) && (
                      <p className="text-xs text-red-600 mt-1">
                        Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fastighetsbeteckning <span className="text-gray-400 font-normal">(krävs för ROT)</span>
                    </label>
                    <input
                      type="text"
                      value={rotData.fastighetsbeteckning}
                      onChange={(e) => setRotData(prev => ({ ...prev, fastighetsbeteckning: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="T.ex. STOCKHOLM SÖDERMALM 1:1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fastighetsbeteckning finns på fastighetsregistret eller kan fås från kommun
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RUT Section */}
            {quote?.include_rut && (
              <div className="card-padded border-l-4 border-purple-500">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">✨</span> RUT-avdrag
                </h3>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-purple-800 leading-relaxed">
                    {getRUTExplanationText()}
                  </p>
                  <p className="text-sm text-purple-700 mt-2 font-medium">
                    Uppskattad RUT-avdrag: {formatRUTAmount(calculateRUTDeduction())}
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-purple-800">
                    <strong>Vill du använda RUT-avdrag?</strong> Fyll i ditt personnummer nedan.
                    Om du inte vill använda RUT-avdrag kan du lämna fältet tomt och bara godkänna offerten.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personnummer <span className="text-gray-400 font-normal">(valfritt)</span>
                    </label>
                    <input
                      type="text"
                      value={rutPersonnummer}
                      onChange={(e) => {
                        const formatted = e.target.value.length >= 10
                          ? formatRUTPersonnummer(e.target.value)
                          : e.target.value;
                        setRutPersonnummer(formatted);
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-purple-500 focus:border-purple-500 ${rutPersonnummer && !validateRUTPersonnummer(rutPersonnummer)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                        }`}
                      placeholder="YYYYMMDD-XXXX"
                    />
                    {rutPersonnummer && !validateRUTPersonnummer(rutPersonnummer) && (
                      <p className="text-xs text-red-600 mt-1">
                        Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Contact Information */}
            <div className="card-padded">
              <h3 className="font-bold text-gray-900 mb-4">Kontaktuppgifter</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-900 font-medium">{quote?.organisation?.name}</span>
                </div>
                {quote?.organisation?.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <a href={`mailto:${quote.organisation.email}`} className="text-blue-600 hover:text-blue-700">
                      {quote.organisation.email}
                    </a>
                  </div>
                )}
                {quote?.organisation?.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <a href={`tel:${quote.organisation.phone}`} className="text-blue-600 hover:text-blue-700">
                      {quote.organisation.phone}
                    </a>
                  </div>
                )}
                {quote?.organisation?.address && (
                  <div className="flex items-start pt-2 border-t border-gray-100">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <div className="text-gray-600">
                      <p>{quote.organisation.address}</p>
                      {quote.organisation.postal_code && quote.organisation.city && (
                        <p>{quote.organisation.postal_code} {quote.organisation.city}</p>
                      )}
                    </div>
                  </div>
                )}
                {quote?.organisation?.org_number && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Org.nr: {quote.organisation.org_number}
                  </div>
                )}
              </div>
            </div>

            {/* Quote Info */}
            <div className="card-padded">
              <h3 className="font-bold text-gray-900 mb-4">Offertinformation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Offertnummer:</span>
                  <span className="text-gray-900 font-medium">{quote?.quote_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Datum:</span>
                  <span className="text-gray-900">{formatDate(quote?.created_at)}</span>
                </div>
                {quote?.valid_until && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giltig till:</span>
                    <span className="text-gray-900">{formatDate(quote.valid_until)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Säker offerthantering</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Denna offert är säkert krypterad och kan endast godkännas en gång.
                    Dina uppgifter behandlas enligt GDPR.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Accept/Decline Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Svara på offerten</h3>
            <p className="text-gray-600 mb-6">
              Genom att godkänna denna offert accepterar du villkoren och bekräftar beställningen.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleAcceptQuote}
                disabled={accepting || declining || (quote?.include_rot && rotData.identifier && (!validateSwedishPersonnummer(rotData.identifier) || !rotData.fastighetsbeteckning.trim()))}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {accepting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Godkänner...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6 mr-3" />
                    Godkänn offert
                  </>
                )}
              </button>

              {!showDeclineForm ? (
                <button
                  onClick={() => setShowDeclineForm(true)}
                  disabled={accepting || declining}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <XCircle className="w-5 h-5 mr-2 text-gray-500" />
                  Avvisa offert
                </button>
              ) : (
                <div className="w-full sm:w-auto flex flex-col items-center gap-3">
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Valfritt: Berätta varför du avvisar offerten..."
                    className="w-full sm:w-80 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeclineForm(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Avbryt
                    </button>
                    <button
                      onClick={handleDeclineQuote}
                      disabled={declining}
                      className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {declining ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Avvisar...
                        </div>
                      ) : (
                        'Bekräfta avvisning'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Genom att godkänna accepterar du våra allmänna villkor och bekräftar beställningen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuoteAcceptance;