/**
 * Home / Landing Page — Velzon Premium Theme.
 */
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { healthCheck } from '../services/authService';

const HomePage = () => {
  const { t } = useTranslation();

  // Wake up the free Render backend instance as soon as the user lands on the website
  useEffect(() => {
    healthCheck().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f3f9] text-stone-700">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-20 sm:py-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-[#29456D]/10 text-[#172B4D] px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-[#29456D]/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#29456D] animate-pulse" />
            {t('home_badge')}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-stone-900 tracking-tight leading-tight">
            {t('home_title')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#172B4D] to-[#405189]">
              {t('home_subtitle')}
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
            {t('home_desc')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-[#29456D] hover:bg-[#172B4D] text-white rounded font-bold text-base transition-all shadow-sm"
            >
              {t('home_get_started')}
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-[#405189] text-[#405189] hover:bg-[#405189] hover:text-white rounded font-bold text-base transition-all shadow-sm"
            >
              {t('home_sign_in')}
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: t('feature1_title'),
              desc: t('feature1_desc'),
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              ),
            },
            {
              title: t('feature2_title'),
              desc: t('feature2_desc'),
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              ),
            },
            {
              title: t('feature3_title'),
              desc: t('feature3_desc'),
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              ),
            },
            {
              title: t('feature4_title'),
              desc: t('feature4_desc'),
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              ),
            },
            {
              title: t('feature5_title'),
              desc: t('feature5_desc'),
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              ),
            },
            {
              title: t('feature6_title'),
              desc: t('feature6_desc'),
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              ),
            },
          ].map((feature, i) => (
            <div key={i} className="bg-white border border-[#e9ebec] rounded p-6 shadow-sm hover:shadow-md hover:border-[#29456D]/55 transition-all">
              <div className="w-12 h-12 bg-[#29456D]/10 rounded-lg flex items-center justify-center mb-4 border border-[#29456D]/20">
                <svg className="w-6 h-6 text-[#172B4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-base font-bold text-stone-850 mb-2">{feature.title}</h3>
              <p className="text-stone-500 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default HomePage;
