import React, { useState } from 'react';
import { ProtocolData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Printer, FileDown, Mail, Copy, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  data: ProtocolData;
}

export const ProtocolPreview: React.FC<Props> = ({ data }) => {
  const { t, language } = useLanguage();
  const currentDate = new Date().toLocaleDateString();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(11); // Default pt size

  const handlePrint = () => {
    window.print();
  };

  const handleWordExport = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
         "xmlns:w='urn:schemas-microsoft-com:office:word' "+
         "xmlns='http://www.w3.org/TR/REC-html40'>"+
         "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header+document.getElementById("preview-content")?.innerHTML+footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Protocol_Synopsis_${data.title.substring(0, 20)}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleEmail = () => {
      const subject = encodeURIComponent(`Synopsis: ${data.title.substring(0, 50)}...`);
      const bodyIntro = language === 'es' 
        ? `Estimados,\n\nAdjunto encontrarán la Sinopsis Metodológica para el estudio titulado: "${data.title}".\n\nPor favor, revisen el documento adjunto (PDF/Word) que he descargado de la aplicación.\n\nSaludos cordiales,\n${data.sponsor || ''}`
        : `Dear Team,\n\nPlease find attached the Methodological Synopsis for the study: "${data.title}".\n\nKindly review the attached document (PDF/Word) I have downloaded.\n\nBest regards,\n${data.sponsor || ''}`;
      
      const body = encodeURIComponent(bodyIntro);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyText = () => {
      const content = document.getElementById("preview-content")?.innerText;
      if (content) {
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-2 flex flex-wrap justify-end gap-2 print:hidden items-center">
             
             {/* View Controls */}
             <div className="flex items-center mr-auto md:mr-4 bg-gray-50 rounded-md border border-gray-200">
                <button 
                    onClick={() => setFontSize(Math.max(8, fontSize - 1))}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-l-md transition-colors"
                    title={language === 'es' ? "Reducir tamaño letra" : "Decrease Font Size"}
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-8 text-center text-gray-500">{fontSize}pt</span>
                <button 
                    onClick={() => setFontSize(Math.min(16, fontSize + 1))}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-r-md transition-colors"
                    title={language === 'es' ? "Aumentar tamaño letra" : "Increase Font Size"}
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
             </div>

             {/* Actions */}
             <button 
                onClick={handleCopyText}
                className="flex items-center text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
                title={language === 'es' ? "Copiar texto al portapapeles" : "Copy text to clipboard"}
            >
                {copied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar' : 'Copy')}
            </button>

             <button 
                onClick={handleEmail}
                className="flex items-center text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
                title={language === 'es' ? "Enviar por Email (abre su cliente de correo)" : "Send via Email client"}
            >
                <Mail className="w-4 h-4 mr-2" />
                Email
            </button>

             <div className="h-6 w-px bg-gray-300 mx-1"></div>

             <button 
                onClick={handleWordExport}
                className="flex items-center text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md transition-colors border border-blue-200"
                title={language === 'es' ? "Descargar .doc editable" : "Download editable .doc"}
            >
                <FileDown className="w-4 h-4 mr-2" />
                Word
            </button>

             <button 
                onClick={handlePrint}
                className="flex items-center text-xs bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm"
                title={language === 'es' ? "Imprimir o Guardar como PDF" : "Print or Save as PDF"}
            >
                <Printer className="w-4 h-4 mr-2" />
                PDF / Print
            </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto bg-gray-200 p-8 print:p-0 print:bg-white flex-1">
        <div 
            id="preview-content" 
            className="mx-auto bg-white shadow-lg w-full max-w-[210mm] min-h-[297mm] p-[20mm] text-black font-serif leading-relaxed print:shadow-none print:max-w-none print:w-full transition-all duration-200"
            style={{ fontSize: `${fontSize}pt` }}
        >
            
            <div className="flex justify-between border-b-2 border-black pb-2 mb-6 text-sm">
                <span>{data.sponsor || 'XXXXXXX'}</span>
                <span>{t.preview.header}</span>
            </div>

            <h1 className="text-xl font-bold uppercase mb-6 text-center">{t.preview.header}</h1>

            {data.contextSummary && (
            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">Summary</h2>
                <p className="text-justify italic bg-gray-50 p-2 rounded-md border border-gray-100 whitespace-pre-wrap print:bg-transparent print:border-none print:p-0">{data.contextSummary}</p>
                <hr className="border-black my-4" />
            </div>
            )}

            <div className="mb-4">
                <h2 className="font-bold text-base mb-2">{t.form.labels.title}</h2>
                <p className="mb-4 font-bold">{data.title || '...'}</p>
                <hr className="border-black my-2" />
            </div>

            <div className="grid grid-cols-[150px_1fr] gap-4 mb-2 items-baseline">
                <span className="font-bold">{t.preview.sponsor}:</span>
                <span>{data.sponsor}</span>
            </div>
            <hr className="border-black my-2" />

            <div className="grid grid-cols-[200px_1fr] gap-4 mb-2 items-baseline">
                <span className="font-bold">{t.preview.tradeName}:</span>
                <span>{data.tradeName}</span>
            </div>
            <hr className="border-black my-2" />

            <div className="grid grid-cols-[200px_1fr] gap-4 mb-2 items-baseline">
                <span className="font-bold">{t.preview.activeIng}:</span>
                <span>{data.activeIngredient}</span>
            </div>
            <hr className="border-black my-2" />

            <div className="grid grid-cols-[200px_1fr] gap-4 mb-4 items-baseline">
                <span className="font-bold">{t.preview.phase}:</span>
                <span>{data.phase}</span>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.rat}</h2>
                <p className="mb-2 italic font-bold">{t.preview.forPrimary}</p>
                {/* Ensure whitespace pre-wrap for paragraphs */}
                <p className="mb-4 text-justify whitespace-pre-wrap">{data.rationalePrimary || '...'}</p>
                
                <p className="mb-2 italic font-bold">{t.preview.forSecondary}</p>
                <p className="text-justify whitespace-pre-wrap">{data.rationaleSecondary || '...'}</p>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.objs}</h2>
                <p className="mb-1 font-bold">{t.preview.principal}</p>
                <ol className="list-decimal pl-5 mb-4">
                    <li>{data.primaryObjective || '...'}</li>
                </ol>
                
                <p className="mb-1 font-bold">{t.preview.secondary}</p>
                <ol className="list-decimal pl-5" start={2}>
                    {data.secondaryObjectives.map((obj, i) => (
                        <li key={i}>{obj || '...'}</li>
                    ))}
                </ol>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.selection}</h2>
                <p className="mb-4 whitespace-pre-wrap">{data.selectionMethod || '...'}</p>
                
                <p className="mb-2 font-bold">{t.preview.pop}</p>
                <p className="mb-2 whitespace-pre-wrap">{data.populationDescription}</p>
                
                <p className="mb-2 font-bold">{t.preview.inc}</p>
                <ul className="list-disc pl-5 mb-4">
                    {data.inclusionCriteria.map((crit, i) => (
                        <li key={i}>{crit || '...'}</li>
                    ))}
                </ul>

                <p className="mb-2 font-bold">{t.preview.exc}</p>
                <ul className="list-disc pl-5 mb-4">
                    {data.exclusionCriteria.map((crit, i) => (
                        <li key={i}>{crit || '...'}</li>
                    ))}
                </ul>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.design}</h2>
                <p className="whitespace-pre-wrap">{data.studyDesign || '...'}</p>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.interv}</h2>
                <p className="whitespace-pre-wrap">{data.interventions || '...'}</p>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.evals}</h2>
                <p className="mb-4 text-justify whitespace-pre-wrap">
                    {data.evaluationsGeneral || '...'}
                </p>
                
                <p className="font-bold italic mb-1">{t.preview.forPrimary}</p>
                <p className="mb-4 whitespace-pre-wrap">{data.evaluationsPrimary || '...'}</p>

                <p className="font-bold italic mb-1">{t.preview.forSecondary}</p>
                <ul className="list-disc pl-5 mb-4">
                    {data.evaluationsSecondary && data.evaluationsSecondary.length > 0 ? data.evaluationsSecondary.map((eva, i) => (
                        <li key={i}>{eva || '...'}</li>
                    )) : <li>...</li>}
                </ul>

                {/* Missing Variable Definitions Added */}
                {data.variableDefinitions.length > 0 && data.variableDefinitions[0] !== '' && (
                    <>
                        <p className="font-bold italic mb-1">{t.form.labels.varDefs}</p>
                        <ul className="list-disc pl-5 mb-4">
                            {data.variableDefinitions.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                    </>
                )}

                {/* Missing Other Variables Added */}
                {data.otherVariables.length > 0 && data.otherVariables[0] !== '' && (
                    <>
                        <p className="font-bold italic mb-1">{t.form.labels.otherVars}</p>
                        <ul className="list-disc pl-5 mb-4">
                            {data.otherVariables.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                    </>
                )}
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.sample}</h2>
                <p className="mb-4 text-justify whitespace-pre-wrap">
                    {data.sampleSizeJustification || '...'}
                </p>
                
                {(data.sampleSizeMethod === 'power' || data.sampleSizeMethod === 'precision') && data.statsParams && (
                    <div className="mb-4 text-sm bg-gray-50 p-3 rounded border border-gray-100 print:border-black print:bg-transparent">
                        <p className="font-semibold mb-1">Parameters:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            {data.sampleSizeMethod === 'power' && (
                                <>
                                    <li>Alpha (Type I Error): {data.statsParams.alpha}</li>
                                    <li>Power (1-Beta): {data.statsParams.power}</li>
                                </>
                            )}
                            {data.sampleSizeMethod === 'precision' && (
                                <li>Precision/CI: {data.statsParams.precision}</li>
                            )}
                            {data.statsParams.deltaOrEffectSize && <li>Effect Size/Delta: {data.statsParams.deltaOrEffectSize}</li>}
                            {data.statsParams.dropoutRate && <li>Expected Dropout: {data.statsParams.dropoutRate}</li>}
                        </ul>
                    </div>
                )}

                <p className="text-justify">
                    {t.preview.sampleText} <strong>{data.numPhysicians}</strong> {t.preview.physicians}, <strong>{data.subjectsPerPhysician}</strong> {t.preview.subjects}. {t.preview.total} <strong>{data.totalSubjects}</strong>.
                </p>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.stats}</h2>
                
                {/* Detailed Hypothesis Display */}
                {data.detailedHypothesis && (
                    <div className="mb-4">
                        <p className="font-bold mb-1">{t.preview.hyp}</p>
                        <p className="italic bg-gray-50 p-2 border border-gray-100 rounded text-sm text-justify whitespace-pre-wrap print:bg-transparent print:border-none print:p-0">{data.detailedHypothesis}</p>
                    </div>
                )}

                <ul className="list-none space-y-2">
                    {data.statisticalAnalysis.map((stat, i) => (
                        <li key={i}><span className="font-bold">Obj {i + 1}.</span> {stat || '...'}</li>
                    ))}
                </ul>
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.preview.dev}</h2>
                <p className="text-justify whitespace-pre-wrap mb-4">{data.recruitmentProcess}</p>
                
                <h3 className="font-bold text-sm mb-2">{t.preview.data}</h3>
                <p className="text-justify whitespace-pre-wrap">{data.dataProcessing}</p>
                
                {/* Simple Table for Schedule */}
                {data.schedule && (
                    <div className="mt-4">
                        <h3 className="font-bold text-sm mb-2">{t.form.labels.schedule}</h3>
                        <table className="w-full text-sm border-collapse border border-gray-300">
                            <tbody>
                                {Object.entries(data.schedule).map(([key, val]) => (
                                    val ? (
                                        <tr key={key}>
                                            <td className="border border-gray-300 p-1 font-semibold bg-gray-50 w-1/3 print:bg-gray-100">
                                                {key === 'ethicsSubmission' && t.form.labels.ethSub}
                                                {key === 'siteInitiation' && t.form.labels.siteInit}
                                                {key === 'firstPatientIn' && t.form.labels.fpi}
                                                {key === 'interimAnalysis' && t.form.labels.interim}
                                                {key === 'lastPatientOut' && t.form.labels.lpo}
                                                {key === 'dbLock' && t.form.labels.dbLock}
                                                {key === 'finalReport' && t.form.labels.finalRep}
                                            </td>
                                            <td className="border border-gray-300 p-1">{formatDate(val as string)}</td>
                                        </tr>
                                    ) : null
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <hr className="border-black my-4" />

            <div className="mb-6">
                <h2 className="font-bold text-base mb-2">{t.form.labels.location}</h2>
                <p>{data.investigatorsLocation}</p>
            </div>
            
            {/* Page Break for Biblio */}
            <div className="mb-6 break-before-page">
                <h2 className="font-bold text-base mb-2 uppercase">{t.preview.biblio}</h2>
                <hr className="border-black mb-4" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.bibliography}</p>
            </div>
            
            {/* Page Break for Appendices */}
            {data.appendices && (
                <div className="mb-6 break-before-page">
                    <h2 className="font-bold text-base mb-4 uppercase text-center">{t.preview.appendices}</h2>
                    <hr className="border-black mb-4" />
                    <div className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 border border-gray-200 print:bg-transparent print:border-none print:p-0">
                        {data.appendices}
                    </div>
                </div>
            )}

            <div className="mt-20 pt-4 border-t border-black flex justify-between text-xs text-gray-600">
                <span>{t.preview.docType}</span>
                <span>{currentDate}</span>
                <span>Page X of Y</span>
            </div>

        </div>
        </div>
    </div>
  );
};