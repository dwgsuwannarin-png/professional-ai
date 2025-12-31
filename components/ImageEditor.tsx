import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { db } from '../services/firebase';
import { GoogleGenAI } from "@google/genai";
import { 
  LogOut, 
  LayoutDashboard, 
  Loader2, 
  Image as ImageIcon, 
  Download, 
  AlertCircle, 
  Sparkles
} from 'lucide-react';

interface Preset {
  id: string;
  labelEN: string;
  labelTH: string;
  prompt: string;
}

const RENOVATION_PRESETS: Preset[] = [
  { 
    id: 'reno_office_dusk', 
    labelEN: 'Modern Office Dusk', 
    labelTH: 'ออฟฟิศโมเดิร์นค่ำ', 
    prompt: 'RENOVATION: High-resolution architectural photography, straight frontal view of a modern 3-4 story office building. The facade design combines dark gray metal panels and rhythmic vertical fins with large floor-to-ceiling glass walls reflecting the sky. The main ground floor entrance is a deep recessed niche, clearly clad in contrasting materials like large cream stone slabs and warm brown wooden slats to create a focal point and welcoming feel. Atmosphere is dusk/twilight. Warm orange light glows from inside every floor, revealing interior details like desks and ceiling lights. The foreground is a wide plaza paved with granite or polished concrete. Only 1-2 large geometric concrete planters are placed at the entrance corners with low trimmed shrubs. No large gardens or trees blocking the building. Sky transitions from deep blue to orange at the horizon. Emphasis on sharp textures of metal, glass, wood, and stone. Photorealistic 8k.' 
  },
  {
    id: 'reno_luxury_commercial',
    labelEN: 'Luxury Commercial',
    labelTH: 'อาคารพาณิชย์หรู',
    prompt: 'RENOVATION: Transform this building into a frontal architectural photograph of a 2-story modern luxury commercial building. Facade design uses cream-colored stone or washed sand texture with a refined brick-like pattern. Key feature: three large vertical recessed panels with repetitive 3D geometric patterns or slats, illuminated by hidden warm white LED uplights to create beautiful light and shadow effects. Ground floor has full-height clear glass storefronts showing luxurious interior and warm lighting. Clean smooth stone plaza in front, no trees blocking the view. Somber evening sky, premium atmosphere, photorealistic 8k.'
  }
];

const LANDSCAPE_SCENES: Preset[] = [
  {
    id: 'land_tropical_resort',
    labelEN: 'Tropical Resort',
    labelTH: 'รีสอร์ททรอปิคอล',
    prompt: 'LANDSCAPE: Wide angle shot of a luxurious tropical resort pool area at sunset. Palm trees, wooden decking, crystal clear water with reflections. Warm ambient lighting. High end architectural visualization style.'
  },
  {
    id: 'land_urban_park',
    labelEN: 'Urban Park',
    labelTH: 'สวนสาธารณะในเมือง',
    prompt: 'LANDSCAPE: Aerial view of a modern urban park with parametric concrete benches, lush green lawns, and contemporary pathway lighting. City skyline in the background during golden hour.'
  }
];

interface ImageEditorProps {
  user: UserData | null;
  onLogout: () => void;
  onBackToAdmin?: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ user, onLogout, onBackToAdmin }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(user);

  // Sync user data
  useEffect(() => {
    if (user?.id) {
       const unsubscribe = db.collection("users").doc(user.id).onSnapshot(doc => {
           if (doc.exists) {
               setCurrentUser({ id: doc.id, ...doc.data() } as UserData);
           }
       });
       return () => unsubscribe();
    }
  }, [user?.id]);

  const handleGenerate = async () => {
      if (!currentUser) return;
      if (!process.env.API_KEY) {
          setError("System Error: API Key not configured.");
          return;
      }
      
      // Check Quota
      if (currentUser.usageCount >= currentUser.dailyQuota && currentUser.id !== 'admin') {
          setError("Daily quota exceeded. Please upgrade your plan.");
          return;
      }

      setGenerating(true);
      setError(null);
      setGeneratedImage(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          let finalPrompt = prompt;
          if (selectedPreset) {
              finalPrompt = `${selectedPreset.prompt}\n\nAdditional details: ${prompt}`;
          }
          
          if (!finalPrompt.trim()) {
              setError("Please enter a prompt or select a preset.");
              setGenerating(false);
              return;
          }

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: finalPrompt }
                ]
            },
            config: {
                // responseMimeType and responseSchema are not supported for nano banana (gemini-2.5-flash-image)
            }
          });
          
          // Extract image
          let imageUrl: string | null = null;
          if (response.candidates?.[0]?.content?.parts) {
             for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
             }
          }

          if (imageUrl) {
              setGeneratedImage(imageUrl);
              
              // Update Quota for non-admin users
              if (currentUser.id !== 'admin') {
                const today = new Date().toISOString().split('T')[0];
                await db.collection("users").doc(currentUser.id).update({
                    usageCount: (currentUser.usageCount || 0) + 1,
                    lastUsageDate: today
                });
              }
          } else {
              throw new Error("No image generated.");
          }

      } catch (err: any) {
          console.error("Generation error:", err);
          setError(err.message || "Failed to generate image.");
      } finally {
          setGenerating(false);
      }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
       {/* Header */}
       <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
             </div>
             <div>
                <h1 className="text-lg font-bold text-white">ProGen AI</h1>
                {currentUser && (
                    <p className="text-[10px] text-slate-400">
                        Credits: {currentUser.dailyQuota - currentUser.usageCount} / {currentUser.dailyQuota}
                    </p>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {onBackToAdmin && (
                 <button 
                   onClick={onBackToAdmin}
                   className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                 >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Panel</span>
                 </button>
             )}
             <div className="h-6 w-px bg-slate-800 mx-1"></div>
             <button 
               onClick={onLogout}
               className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
               title="Logout"
             >
                <LogOut className="w-5 h-5" />
             </button>
          </div>
       </header>

       <main className="flex-1 container mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Presets */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                 <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Style Presets</h3>
                 <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Architecture & Renovation</label>
                        <div className="grid grid-cols-1 gap-2">
                            {RENOVATION_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setSelectedPreset(selectedPreset?.id === preset.id ? null : preset)}
                                    className={`text-left p-3 rounded-xl border transition-all text-sm ${
                                        selectedPreset?.id === preset.id 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="font-semibold">{preset.labelEN}</div>
                                    <div className="text-[10px] opacity-70">{preset.labelTH}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Landscape & Environment</label>
                        <div className="grid grid-cols-1 gap-2">
                            {LANDSCAPE_SCENES.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setSelectedPreset(selectedPreset?.id === preset.id ? null : preset)}
                                    className={`text-left p-3 rounded-xl border transition-all text-sm ${
                                        selectedPreset?.id === preset.id 
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' 
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                    }`}
                                >
                                    <div className="font-semibold">{preset.labelEN}</div>
                                    <div className="text-[10px] opacity-70">{preset.labelTH}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                 </div>
              </div>

              {/* Prompt Input */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Custom Details</h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your vision or add details to the selected preset..."
                    className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none placeholder-slate-600"
                  />
                  <div className="mt-4">
                      <button
                        onClick={handleGenerate}
                        disabled={generating || (!prompt && !selectedPreset)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                         {generating ? 'Dreaming...' : 'Generate Image'}
                      </button>
                      {error && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-xs">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{error}</span>
                          </div>
                      )}
                  </div>
              </div>

          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2 flex flex-col h-full min-h-[500px]">
             <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-1 overflow-hidden relative group">
                {generatedImage ? (
                    <div className="w-full h-full relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                        <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain" />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={downloadImage}
                                className="p-2 bg-slate-900/80 backdrop-blur text-white hover:text-indigo-400 rounded-lg shadow-lg border border-slate-700"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full rounded-xl bg-slate-950/50 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800">
                        {generating ? (
                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-indigo-500 animate-spin" />
                                </div>
                                <p className="text-sm font-medium text-indigo-400">AI is crafting your image...</p>
                            </div>
                        ) : (
                            <>
                                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-sm">Select a style and click Generate to start</p>
                            </>
                        )}
                    </div>
                )}
             </div>
          </div>

       </main>
    </div>
  );
};
