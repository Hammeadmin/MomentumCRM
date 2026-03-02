import React from 'react';
import { Calculator, Info, User, Sparkles } from 'lucide-react';
import { formatRUTAmount, type RUTData } from '../lib/rut';
import { formatCurrency } from '../lib/database';

interface RUTInformationProps {
    data: RUTData;
    totalAmount: number;
    showDetails?: boolean;
    className?: string;
}

function RUTInformation({ data, totalAmount, showDetails = true, className = '' }: RUTInformationProps) {
    if (!data.include_rut || !data.rut_amount) {
        return null;
    }

    const netAmount = totalAmount - (data.rut_amount || 0);

    return (
        <div className={`bg-purple-50 border border-purple-200 rounded-lg p-4 ${className}`}>
            <div className="flex items-center mb-3">
                <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                <h4 className="font-medium text-purple-900">RUT-avdrag inkluderat</h4>
            </div>

            {showDetails && (
                <div className="space-y-3">
                    {/* Customer Info */}
                    {data.rut_personnummer && (
                        <div className="flex items-center text-sm">
                            <User className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-purple-800">
                                Privatperson: {data.rut_personnummer}
                            </span>
                        </div>
                    )}

                    {/* RUT Calculation */}
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Totalt belopp:</span>
                                <span className="text-gray-900">{formatCurrency(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Arbetskostnad (100%):</span>
                                <span className="text-gray-900">{formatCurrency(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-purple-700 font-medium">
                                <span>RUT-avdrag (50%):</span>
                                <span>-{formatRUTAmount(data.rut_amount)}</span>
                            </div>
                            <div className="flex justify-between border-t border-purple-200 pt-2 font-bold text-purple-800">
                                <span>Att betala:</span>
                                <span>{formatRUTAmount(netAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start text-xs text-purple-700">
                        <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                        <span>
                            RUT-avdraget dras av direkt från fakturan. Du behöver inte ansöka separat hos Skatteverket.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RUTInformation;
