import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideos } from '../services/authService';
import Sidebar from '../components/ui/Sidebar';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const VideosPage = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const res = await getVideos();
        if (res?.status && Array.isArray(res.data)) {
          setVideos(res.data);
        } else {
          toast.error(res?.message || 'Failed to load videos');
        }
      } catch (err) {
        toast.error('Error fetching classroom videos');
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, []);

  const getFallbackThumbnail = (subject) => {
    const sub = String(subject).toLowerCase();
    if (sub.includes('math')) return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    if (sub.includes('science')) return 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)';
    if (sub.includes('english')) return 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
    if (sub.includes('social') || sub.includes('history')) return 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)';
    return 'linear-gradient(135deg, #1E3A8A 0%, #405189 100%)';
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] flex flex-col md:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#F7F9FC] p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#172B4D] border border-[#29456D] shadow-sm rounded-2xl p-6 text-white">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#DBEAFE] mb-1">Classroom Lectures</div>
            <h1 className="text-2xl font-black text-white">Class Recordings</h1>
            <p className="text-[#CBD5E1] text-sm mt-0.5">Recorded lessons and video lectures available for playback.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white border border-[#e9ebec] rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-200 text-3xl">
              🎥
            </div>
            <h3 className="text-lg font-bold text-stone-850">No recordings available</h3>
            <p className="text-stone-500 text-xs mt-1 leading-normal max-w-sm mx-auto">
              There are currently no video recordings uploaded for your class standard and section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((vid) => (
              <div 
                key={vid._id}
                onClick={() => navigate(`/videos/${vid._id}`)}
                className="bg-white border border-[#e9ebec] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer flex flex-col group"
              >
                {/* Thumbnail */}
                <div 
                  className="aspect-video w-full relative flex items-center justify-center text-white font-extrabold uppercase text-lg border-b border-stone-100 select-none overflow-hidden"
                  style={{ background: getFallbackThumbnail(vid.subject) }}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors" />
                  <span className="z-10 tracking-widest drop-shadow">{vid.subject}</span>
                  
                  {/* Play Button Overlay */}
                  <div className="absolute w-12 h-12 bg-white/20 group-hover:bg-white/90 text-white group-hover:text-[#172B4D] rounded-full flex items-center justify-center text-lg backdrop-blur-sm group-hover:scale-110 transition-all shadow border border-white/30 group-hover:border-transparent">
                    ▶
                  </div>

                  <span className="absolute bottom-2.5 right-2.5 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded font-black tracking-wider">
                    {vid.duration}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-[#172B4D] uppercase tracking-wider bg-[#29456D]/5 border border-[#29456D]/10 px-2 py-0.5 rounded">
                        Class {vid.standard}-{vid.section}
                      </span>
                      <span className="text-stone-400 font-bold font-mono">
                        {vid.uploadDate ? new Date(vid.uploadDate).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-850 group-hover:text-[#172B4D] transition-colors line-clamp-1">
                      {vid.title}
                    </h3>
                    <p className="text-stone-500 text-[11px] leading-relaxed line-clamp-2">
                      {vid.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="border-t border-stone-100 pt-3 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="font-bold text-stone-400 block uppercase tracking-wider text-[8px]">Teacher</span>
                      <span className="font-bold text-stone-750">{vid.teacherName}</span>
                    </div>
                    <span className="text-[#405189] font-black uppercase tracking-wider hover:underline">
                      Watch Lecture →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideosPage;
