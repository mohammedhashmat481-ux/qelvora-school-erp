import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideos, submitFeedback, updateFeedback, deleteFeedback, getVideoFeedback } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/ui/Sidebar';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const VideoPlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, selectedProfile } = useAuth();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoFeedback, setVideoFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('review');
  
  // Rating & Suggestion form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [suggestion, setSuggestion] = useState('');
  const [editingReview, setEditingReview] = useState(null); // stores the review currently being edited
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const videoRef = useRef(null);
  const token = localStorage.getItem('access_token');
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Helper to parse youtube URLs or filenames
  const getEmbedUrl = (urlOrFile) => {
    if (!urlOrFile) return "https://www.youtube.com/embed/0GshjM9o1G0";
    if (urlOrFile.includes('youtube.com/watch') || urlOrFile.includes('youtu.be') || urlOrFile.includes('youtube.com/embed')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = urlOrFile.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0`;
      }
    }
    return null;
  };

  const embedUrl = getEmbedUrl(video?.videoUrl);
  const finalStreamUrl = `${API_URL}/videos/stream/${video?.videoUrl}?token=${token}`;

  // Load video details
  useEffect(() => {
    const loadVideoDetails = async () => {
      try {
        const res = await getVideos();
        if (res?.status && Array.isArray(res.data)) {
          const matched = res.data.find(v => v._id === id);
          if (matched) {
            setVideo(matched);

            // Load all feedback for this video
            try {
              setFeedbackLoading(true);
              const fbRes = await getVideoFeedback(id);
              if (fbRes.status && Array.isArray(fbRes.data)) {
                setVideoFeedback(fbRes.data);
              }
            } catch (err) {
              console.error('Failed to load video feedback:', err);
            } finally {
              setFeedbackLoading(false);
            }
          } else {
            toast.error('Video recording not found or unauthorized');
            navigate('/videos');
          }
        }
      } catch (err) {
        toast.error('Error fetching video details');
      } finally {
        setLoading(false);
      }
    };
    loadVideoDetails();
  }, [id, user, token, navigate]);

  // Resume playback on video load (only for local video player)
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const savedTime = localStorage.getItem(`video_progress_${id}`);
    if (savedTime) {
      const time = parseFloat(savedTime);
      if (time > 5 && time < videoRef.current.duration - 5) {
        videoRef.current.currentTime = time;
        toast.success(`Resumed playback at ${Math.floor(time / 60)}m ${Math.floor(time % 60)}s`);
      }
    }
  };

  // Save playback progress (only for local video player)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    localStorage.setItem(`video_progress_${id}`, videoRef.current.currentTime.toString());
  };

  // Change playback speed
  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Submit Feedback
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating (1-5 stars)');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (editingReview) {
        // Update review
        res = await updateFeedback(editingReview._id, { rating, suggestion }, 'parent');
        if (res.status) {
          toast.success('Feedback updated successfully!');
          setEditingReview(null);
          setRating(0);
          setSuggestion('');
        } else {
          toast.error(res.message || 'Failed to update feedback');
        }
      } else {
        // Create new review
        res = await submitFeedback({ videoId: id, rating, suggestion }, 'parent');
        if (res.status) {
          toast.success('Feedback submitted successfully!');
          setRating(0);
          setSuggestion('');
        } else {
          toast.error(res.message || 'Failed to submit feedback');
        }
      }

      // Reload reviews list
      const fbRes = await getVideoFeedback(id);
      if (fbRes.status && Array.isArray(fbRes.data)) {
        setVideoFeedback(fbRes.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing your feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Feedback
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const res = await deleteFeedback(reviewId, 'parent');
      if (res.status) {
        toast.success('Review deleted successfully!');
        if (editingReview?._id === reviewId) {
          setEditingReview(null);
          setRating(0);
          setSuggestion('');
        }
        // Reload reviews list
        const fbRes = await getVideoFeedback(id);
        if (fbRes.status && Array.isArray(fbRes.data)) {
          setVideoFeedback(fbRes.data);
        }
      } else {
        toast.error(res.message || 'Failed to delete review');
      }
    } catch (err) {
      toast.error('Error deleting review');
    }
  };

  // Helpers for feedback list display
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500 text-white',
      'bg-emerald-500 text-white',
      'bg-indigo-500 text-white',
      'bg-violet-500 text-white',
      'bg-amber-500 text-white',
      'bg-pink-500 text-white',
      'bg-teal-500 text-white'
    ];
    let sum = 0;
    for (let i = 0; i < (name || '').length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'some time ago';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
    if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString();
  };

  const renderStars = (ratingVal) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={s <= ratingVal ? "text-amber-400 text-[10px]" : "text-gray-200 text-[10px]"}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f3f9] text-stone-850 flex flex-col md:flex-row font-sans">
      <Sidebar />

      <div className="flex-1 bg-[#f3f3f9] p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : !video ? (
          <div className="text-center py-12">Video not found.</div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigate('/videos')}
                className="text-[#172B4D] hover:underline font-bold text-xs flex items-center gap-1.5"
              >
                ← Back to Recordings List
              </button>
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 bg-stone-200/60 px-3 py-1 rounded-full">
                Class {video.standard} - {video.section}
              </span>
            </div>

            {/* Main Player Card */}
            <div className="bg-white border border-[#e9ebec] shadow-md rounded-2xl overflow-hidden">
              <div className="aspect-video w-full bg-black relative">
                {embedUrl ? (
                  <iframe
                    className="w-full h-full object-contain animate-none"
                    src={embedUrl}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={finalStreamUrl}
                    controls
                    className="w-full h-full object-contain"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                  />
                )}
              </div>

              {/* Title & Info */}
              <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-[#172B4D] tracking-widest block">{video.subject}</span>
                  <h1 className="text-xl font-black text-stone-850">{video.title}</h1>
                  <p className="text-xs text-stone-550">Taught by <span className="font-bold text-stone-800">{video.teacherName}</span> (ID: {video.teacherId})</p>
                </div>

                {/* Speed Controller (only for local video player) */}
                {!embedUrl && (
                  <div className="flex items-center gap-2.5">
                    <label className="text-[10px] font-bold text-stone-400 uppercase">Speed</label>
                    <select
                      value={playbackSpeed}
                      onChange={handleSpeedChange}
                      className="text-xs bg-stone-50 border border-stone-200 rounded px-2 py-1 outline-none font-bold text-stone-700 cursor-pointer focus:border-[#29456D]"
                    >
                      <option value="0.5">0.5x</option>
                      <option value="1">1.0x (Normal)</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2">2.0x</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="p-6 bg-stone-50/50 border-b border-stone-100">
                <h4 className="text-xs font-bold text-stone-450 uppercase tracking-widest mb-1.5">Lecture Description</h4>
                <p className="text-stone-600 text-xs leading-relaxed">{video.description || 'No description provided for this classroom video recording.'}</p>
              </div>

              {/* Tab Contents */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-8">
                  {/* Review Intro Text */}
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-gray-900">Course Review</h3>
                    <p className="text-gray-500 text-xs font-medium">
                      Share your thoughts and rate this course. Your feedback helps improve the learning experience.
                    </p>
                  </div>

                  {/* Ratings & Suggestions Form Section for Parents */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h4 className="text-base font-black text-stone-850">
                          {editingReview ? 'Edit your Review' : 'Leave a Review'}
                        </h4>
                        <p className="text-stone-500 text-xs mt-0.5">Evaluate teaching quality, interaction level, and clarity.</p>
                      </div>
                    </div>

                      <form onSubmit={handleSubmitReview} className="space-y-4">
                        {/* Star Selector */}
                        <div className="space-y-1">
                          <label className="block text-xs sm:text-sm font-black text-stone-700 uppercase tracking-wider">Teacher Rating</label>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="text-3xl focus:outline-none transition-all active:scale-90"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                              >
                                <span 
                                  className={
                                    star <= (hoverRating || rating)
                                      ? 'text-amber-400 drop-shadow-sm select-none'
                                      : 'text-stone-200 select-none'
                                  }
                                >
                                  ★
                                </span>
                              </button>
                            ))}
                            {rating > 0 && (
                              <span className="text-xs sm:text-sm font-bold text-stone-600 ml-2">
                                ({rating} / 5 stars)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Suggestion box */}
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-black text-stone-700 uppercase tracking-wider">Review Comments / Suggestions</label>
                          <textarea
                            rows={3}
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                            placeholder="e.g. Excellent interaction. Please slow down during complex topics..."
                            className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm outline-none focus:border-[#29456D] text-stone-800 placeholder-stone-400 font-medium"
                          />
                          <div className="flex flex-wrap gap-2 pt-1">
                            {["The teacher explains concepts clearly.", "Please slow down during difficult topics.", "Please include more practical examples.", "Excellent classroom interaction."].map((suggestText) => (
                              <button
                                type="button"
                                key={suggestText}
                                onClick={() => setSuggestion(prev => (prev ? prev + ' ' : '') + suggestText)}
                                className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                              >
                                + {suggestText}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-1 flex justify-between items-center">
                          {editingReview ? (
                            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-bold">
                              ✓ Editing Previously Submitted Feedback
                            </span>
                          ) : (
                            <span className="text-xs text-stone-500 italic font-semibold">
                              Multiple reviews can be submitted for review history.
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            {editingReview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReview(null);
                                  setRating(0);
                                  setSuggestion('');
                                }}
                                className="px-4 py-2 border border-stone-250 text-stone-500 text-xs font-bold rounded-xl transition-all hover:bg-stone-50 cursor-pointer"
                              >
                                Cancel Edit
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-5 py-2.5 bg-[#29456D] hover:bg-[#172B4D] text-white text-sm font-black rounded-xl transition-all shadow disabled:opacity-50 cursor-pointer"
                            >
                              {isSubmitting ? 'Saving...' : editingReview ? 'Update Review' : 'Submit Review'}
                            </button>
                          </div>
                        </div>
                      </form>
                  </div>

                  {/* Feedback Reviews List Display */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2">
                      Reviews ({videoFeedback.length})
                    </h4>

                    {feedbackLoading ? (
                      <div className="text-center py-6"><Spinner size="sm" /></div>
                    ) : videoFeedback.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl">
                        No reviews have been left for this recording yet.
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {videoFeedback.map((rev) => (
                          <div 
                            key={rev._id} 
                            className="bg-white border border-gray-150 rounded-xl p-4 flex gap-3.5 shadow-sm hover:shadow transition-shadow"
                          >
                            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${getAvatarColor(rev.studentName)}`}>
                              {getInitials(rev.studentName)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <div className="font-bold text-gray-950 text-xs flex items-center gap-2">
                                  {rev.studentName}
                                  {rev.student === user?._id && (
                                    <span className="bg-stone-100 text-stone-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-stone-200">
                                      My Review
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-gray-400 font-semibold">{formatRelativeTime(rev.date)}</span>
                                  {rev.student === user?._id && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingReview(rev);
                                          setRating(rev.rating);
                                          setSuggestion(rev.suggestion || '');
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="text-[#172B4D] hover:text-[#172B4D] text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        title="Edit review"
                                      >
                                        ✏️ Edit
                                      </button>
                                      <span className="text-gray-300 text-[10px]">|</span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReview(rev._id)}
                                        className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                        title="Delete review"
                                      >
                                        🗑️ Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                {renderStars(rev.rating)}
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {rev.rating}/5
                                </span>
                              </div>

                              <p className="text-stone-650 text-xs leading-normal font-medium mt-1">
                                {rev.suggestion || 'Class attended and rated successfully.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerPage;
