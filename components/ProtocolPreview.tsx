import React from 'react';
import { ProtocolData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  data: ProtocolData;
}

export const ProtocolPreview: React.FC<Props> = ({ data }) => {
  const { t } = useLanguage();
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="h-full overflow-y-auto bg-gray-200 p-8">
      <div className="mx-auto bg-white shadow-lg w-full max-w-[210mm] min-h-[297mm] p-[20mm] text-black font-serif text-[11pt] leading-relaxed">
        
        <div className="flex justify-between border-b-2 border-black pb-2 mb-6 text-sm">
            <span>{data.sponsor || 'XXXXXXX'}</span>
            <span>{t.preview.header}</span>
        </div>

        <h1 className="text-xl font-bold uppercase mb-6 text-center">{t.preview.header}</h1>

        {data.contextSummary && (
          <div className="mb-6">
            <h2 className="font-bold text-base mb-2">Summary</h2>
            <p className="text-justify italic bg-gray-50 p-2 rounded-md border border-gray-100">{data.contextSummary}</p>
            <hr className="border-black my-4" />
          </div>
        )}

        <div className="mb-4">
            <h2 className="font-bold text-base mb-2">{t.form.labels.title}</h2>
            <p className="mb-4">{data.title || '...'}</p>
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
            <p className="mb-2 italic">{t.preview.forPrimary}</p>
            <p className="mb-4 text-justify">{data.rationalePrimary || '...'}</p>
            
            <p className="mb-2 italic">{t.preview.forSecondary}</p>
            <p className="text-justify">{data.rationaleSecondary || '...'}</p>
        </div>
        <hr className="border-black my-4" />

        <div className="mb-6">
             <h2 className="font-bold text-base mb-2">{t.preview.objs}</h2>
             <p className="mb-1">{t.preview.principal}</p>
             <ol className="list-decimal pl-5 mb-4">
                 <li>{data.primaryObjective || '...'}</li>
             </ol>
             
             <p className="mb-1">{t.preview.secondary}</p>
             <ol className="list-decimal pl-5" start={2}>
                 {data.secondaryObjectives.map((obj, i) => (
                     <li key={i}>{obj || '...'}</li>
                 ))}
             </ol>
        </div>
        <hr className="border-black my-4" />

        <div className="mb-6">
            <h2 className="font-bold text-base mb-2">{t.preview.selection}</h2>
            <p className="mb-4">{data.selectionMethod || '...'}</p>
            
            <p className="mb-2 font-bold">{t.preview.pop}</p>
            <p className="mb-2">{data.populationDescription}</p>
            
            <p className="mb-2">{t.preview.inc}</p>
            <ol className="list-decimal pl-5 mb-4">
                 {data.inclusionCriteria.map((crit, i) => (
                     <li key={i}>{crit || '...'}</li>
                 ))}
            </ol>

            <p className="mb-2">{t.preview.exc}</p>
            <ol className="list-decimal pl-5 mb-4">
                 {data.exclusionCriteria.map((crit, i) => (
                     <li key={i}>{crit || '...'}</li>
                 ))}
            </ol>
        </div>
        <hr className="border-black my-4" />

        <div className="mb-6">
            <h2 className="font-bold text-base mb-2">{t.preview.design}</h2>
            <p>{data.studyDesign || '...'}</p>
        </div>
        <hr className="border-black my-4" />

        <div className="mb-6">
            <h2 className="font-bold text-base mb-2">{t.preview.interv}</h2>
            <p>{data.interventions || '...'}</p>
        </div>
        <hr className="border-black my-4" />

        <div className="mb-6">
            <h2 className="font-bold text-base mb-2">{t.preview.evals}</h2>
            <p className="mb-4 text-justify">
                {data.evaluationsGeneral || '...'}
            </p>
            
            <p className="font-bold italic mb-1">{t.preview.forPrimary}</p>
            <p className="mb-4">{data.evaluationsPrimary || '...'}</p>

            <p className="font-bold italic mb-1">{t.preview.forSecondary}</p>
            <ul className="list-disc pl-5 mb-4">
                 {data.evaluationsSecondary && data.evaluationsSecondary.length > 0 ? data.evaluationsSecondary.map((eva, i) => (
                     <li key={i}>{eva || '...'}</li>
                 )) : <li>...</li>}
            </ul>
        </div>
        <hr className="border-black my-4" />

         <div className="mb-6">
            <h2 className="font-bold text-base mb-2">{t.preview.sample}</h2>
            <p className="mb-4 text-justify">
                {data.sampleSizeJustification || '...'}
            </p>
            <p className="text-justify">
                {t.preview.sampleText} <strong>{data.numPhysicians}</strong> {t.preview.physicians}, <strong>{data.subjectsPerPhysician}</strong> {t.preview.subjects}. {t.preview.total} <strong>{data.totalSubjects}</strong>.
            </p>
        </div>
        <hr className="border-black my-4" />

         <div className="mb-6">
            <h2 className="font-bold text-base mb-2">{t.preview.stats}</h2>
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
        </div>
        <hr className="border-black my-4" />

         <div className="mb-6">
             <h2 className="font-bold text-base mb-2">{t.form.labels.location}</h2>
             <p>{data.investigatorsLocation}</p>
         </div>
         <hr className="border-black my-4" />

          <div className="mb-6">
             <h2 className="font-bold text-base mb-2">{t.preview.biblio}</h2>
             <p className="whitespace-pre-wrap">{data.bibliography}</p>
         </div>

         <div className="mt-20 pt-4 border-t border-black flex justify-between text-xs text-gray-600">
            <span>{t.preview.docType}</span>
            <span>{currentDate}</span>
            <span>Pag. X/X</span>
         </div>

      </div>
    </div>
  );
};