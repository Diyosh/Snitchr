import React from 'react';
import './LandingPage.css';
import logo from './logo.png';
import qr from './qr.png'; // <-- You forgot to import the QR image

export default function LandingPage() {
  // Smooth scroll to download
  const scrollToDownload = () => {
    const downloadSection = document.getElementById('download');
    if (downloadSection) {
      downloadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo-container">
          <img src={logo} alt="CatchEd Logo" className="logo" />
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
        <p>Detecting Misinformation in Philippine Education Posts</p>
        <div className="hero-buttons">
          <button onClick={scrollToDownload}>Learn More</button>
          <button className="secondary" onClick={scrollToDownload}>Try CatchEd</button>
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
      <section className="download" id="download">
        <h2>Download CatchEd</h2>
        <p>🤖 Open this link on your device (or scan the QR code) to install the app:</p>
        <a
          href="https://expo.dev/accounts/devjoshmndz/projects/snitchr-ui/builds/7716132a-aa75-49b9-9c5a-7ae7a0067a5e"
          target="_blank"
          rel="noopener noreferrer"
          className="download-link"
        >
          https://expo.dev/accounts/devjoshmndz/projects/snitchr-ui/builds/7716132a-aa75-49b9-9c5a-7ae7a0067a5e
        </a>

        {/* QR Code */}
        <div className="qr-container">
          <img src={qr} alt="QR Code" className="qr-code" />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 Joshua B. Mendoza | Naga College Foundation</p>
      </footer>
    </div>
  );
}
