import React from 'react';
import { Heart, Github } from 'lucide-react';
import Feedback from './Feedback';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-4 mt-8 text-center">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Main Links */}
          <div className="flex items-center flex-wrap justify-center gap-3 text-sm">
            <a
              href="https://github.com/hussaino03/QuestLog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-[#77AAF7] dark:hover:text-[#77AAF7] transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Source</span>
            </a>
            <span className="text-gray-400">•</span>
            <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-[#77AAF7] dark:hover:text-[#77AAF7] transition-colors">
              <Feedback />
            </span>
            <span className="text-gray-400">•</span>
            <a
              href="https://paypal.me/hussaino03"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-[#77AAF7] dark:hover:text-[#77AAF7] transition-colors"
            >
              <Heart className="w-4 h-4" />
              <span>Support</span>
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <Link to="/legal/privacy" className="hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/legal/terms" className="hover:underline">Terms of Service</Link>
            <span>•</span>
            <span>© {new Date().getFullYear()} QuestLog</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;