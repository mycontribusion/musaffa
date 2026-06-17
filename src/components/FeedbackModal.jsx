import { X } from 'lucide-react'

export default function FeedbackModal({ onClose }) {
    return (
        <div
            className="modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
                <div className="modal-header">
                    <div>
                        <h2 id="feedback-title" className="modal-title">Feedback & Suggestions</h2>
                        <p className="modal-subtitle">We'd love to hear from you</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="modal-close"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-links">
                    <a
                        href="mailto:ahmadmusamuhd@gmail.com"
                        className="feedback-card feedback-card-email"
                    >
                        <div className="feedback-icon feedback-icon-email">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                        </div>
                        <div className="feedback-copy">
                            <span className="feedback-label feedback-label-email">Email</span>
                            <span className="feedback-text">Send an Email</span>
                        </div>
                    </a>

                    <a
                        href="https://www.linkedin.com/in/ahmad-m-musa-b93587156/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feedback-card feedback-card-linkedin"
                    >
                        <div className="feedback-icon feedback-icon-linkedin">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </div>
                        <div className="feedback-copy">
                            <span className="feedback-label feedback-label-linkedin">LinkedIn</span>
                            <span className="feedback-text">Send a DM</span>
                        </div>
                    </a>
                </div>

                <p className="modal-note">
                    <strong>Data Sources:</strong><br />
                    <a href="https://api.alquran.cloud/v1/quran/quran-uthmani-quran-academy" target="_blank" rel="noopener noreferrer">quran-ar.json</a> - Al Quran Cloud (Quran Academy Uthmani)<br />
                    <a href="https://api.alquran.cloud/v1/quran/en.sahih" target="_blank" rel="noopener noreferrer">quran-en.json</a> - Al Quran Cloud (Saheeh International)<br />
                    <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">quran-simple.txt</a> - Tanzil Project<br />
                    <a href="https://github.com/Waqar144/Quran_Mutashabihat_Data" target="_blank" rel="noopener noreferrer">waqar114</a> - Waqar144 Mutashabihat Dataset
                </p>
            </div>
        </div>
    )
}
