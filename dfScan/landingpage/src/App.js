import React from 'react';
import './LandingPage.css';
import logo from './logo.png';

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo-container">
          <img src={logo} alt="CatchEd Logo" className="logo" />
          <span className="app-name">CatchEd</span>
        </div>
        <ul className="nav-links">
          <li><a href="#problem">Problem</a></li>
          <li><a href="#solution">Solution</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#about">About</a></li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <h1>CatchEd</h1>
        <p>Detecting Misinformation in Philippine Education Posts </p>
        <div className="hero-buttons">
          <button>Learn More</button>
          <button className="secondary">Try CatchEd</button>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="problem" id="problem">
        <h2>The Problem</h2>
        <p>
          Fake news targeting the Philippine education sector leads to confusion, mistrust,
          and misinformation among students, parents, and educators. 
          CatchEd tackles this growing problem with cutting-edge AI technology.
        </p>
      </section>

      {/* Solution */}
      <section className="solution" id="solution">
        <h2>Our Solution</h2>
        <div className="solution-cards">
          <div className="card">
            <h3>OCR Extraction</h3>
            <p>Extracts text from images using Optical Character Recognition.</p>
          </div>
          <div className="card">
            <h3>CNN Analysis</h3>
            <p>Detects visual misinformation patterns using Convolutional Neural Networks.</p>
          </div>
          <div className="card">
            <h3>Logistic Regression</h3>
            <p>Classifies extracted text for real or fake news prediction.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">📷 Upload Image</div>
          <div className="step">📊 Analyze Post</div>
          <div className="step">✅ Get Result</div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <h2>Key Features</h2>
        <ul>
          <li>OCR Text Extraction</li>
          <li>CNN Visual Analysis</li>
          <li>Logistic Regression Text Classification</li>
          <li>Real-time Mobile Results</li>
        </ul>
      </section>

      {/* About Section */}
      <section className="about" id="about">
        <h2>About CatchEd</h2>
        <p>
          A Special Capstone Project | Bachelor of Science in Computer Science<br/>
          College of Computer Studies | Naga College Foundation, Inc. | 2025
        </p>
      </section>

      {/* Download Section */}
      <section className="download">
        <h2>Coming Soon!</h2>
        <p>Stay tuned for the official launch of CatchEd mobile app.</p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 Joshua B. Mendoza | Naga College Foundation</p>
      </footer>
    </div>
  );
}
