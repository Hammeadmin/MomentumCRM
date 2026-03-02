import React from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import {
    validateSwedishPersonnummer,
    formatSwedishPersonnummer,
    calculateRUTAmount,
    getRUTExplanationText,
    formatRUTAmount,
    type RUTData
} from '../lib/rut';
import HelpTooltip from './HelpTooltip';

interface RUTFieldsProps {
    data: RUTData;
    onChange: (data: RUTData) => void;
    totalAmount?: number;
    showCalculation?: boolean;
    className?: string;
}

function RUTFields({
    data,
    onChange,
    totalAmount = 0,
    showCalculation = true,
    className = ''
}: RUTFieldsProps) {

    const handleRUTToggle = (includeRUT: boolean) => {
        onChange({
            ...data,
            include_rut: includeRUT,
            rut_personnummer: includeRUT ? data.rut_personnummer : null,
            rut_amount: includeRUT ? calculateRUTAmount(totalAmount) : 0
        });
    };

    const handleIdentifierChange = (identifier: string) => {
        const formatted = identifier.length >= 10 ? formatSwedishPersonnummer(identifier) : identifier;
        onChange({
            ...data,
            rut_personnummer: formatted,
            rut_amount: data.include_rut ? calculateRUTAmount(totalAmount) : 0
        });
    };

    const isIdentifierValid = data.rut_personnummer
        ? validateSwedishPersonnummer(data.rut_personnummer)
        : true;

    const calculatedRUTAmount = data.include_rut ? calculateRUTAmount(totalAmount) : 0;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* RUT Toggle */}
            <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-3">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.include_rut}
                            onChange={(e) => handleRUTToggle(e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-purple-900">
                            Inkludera RUT-avdrag
                        </span>
                    </label>
                    <HelpTooltip
                        content={getRUTExplanationText()}
                        title="Vad är RUT-avdrag?"
                        size="lg"
                    />
                </div>

                {showCalculation && data.include_rut && (
                    <div className="text-right">
                        <div className="flex items-center text-sm text-purple-700">
                            <Calculator className="w-4 h-4 mr-1" />
                            <span className="font-medium">
                                RUT-avdrag: {formatRUTAmount(calculatedRUTAmount)}
                            </span>
                        </div>
                        <div className="text-xs text-purple-600">
                            Att betala: {formatRUTAmount(totalAmount - calculatedRUTAmount)}
                        </div>
                    </div>
                )}
            </div>

            {/* RUT Information Fields */}
            {data.include_rut && (
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center text-sm text-purple-700 bg-purple-50 p-3 rounded-md">
                        <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>RUT-avdrag gäller endast privatpersoner. Ange personnummer nedan.</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Personnummer *
                        </label>
                        <input
                            type="text"
                            value={data.rut_personnummer || ''}
                            onChange={(e) => handleIdentifierChange(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 ${data.rut_personnummer && !isIdentifierValid
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                                }`}
                            placeholder="YYYYMMDD-XXXX eller YYMMDD-XXXX"
                        />
                        {data.rut_personnummer && !isIdentifierValid && (
                            <p className="text-xs text-red-600 mt-1">
                                Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX
                            </p>
                        )}
                    </div>

                    {/* RUT Calculation Display */}
                    {data.include_rut && totalAmount > 0 && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                                <Calculator className="w-4 h-4 mr-2" />
                                RUT-beräkning
                            </h4>
                            <div className="text-sm text-purple-800 space-y-1">
                                <div className="flex justify-between">
                                    <span>Totalt belopp:</span>
                                    <span>{formatRUTAmount(totalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Arbetskostnad (Uppskattad):</span>
                                    <span>{formatRUTAmount(totalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>RUT-avdrag (50% av arbetskostnad):</span>
                                    <span className="font-bold">{formatRUTAmount(calculatedRUTAmount)}</span>
                                </div>
                                <div className="flex justify-between border-t border-purple-300 pt-1 font-bold">
                                    <span>Att betala efter RUT:</span>
                                    <span>{formatRUTAmount(totalAmount - calculatedRUTAmount)}</span>
                                </div>
                            </div>
                            <p className="text-xs text-purple-700 mt-2">
                                * RUT-avdraget dras av direkt från fakturan. Du behöver inte ansöka separat.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default RUTFields;
