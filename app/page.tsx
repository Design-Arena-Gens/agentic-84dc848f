'use client'

import { useState, useEffect } from 'react'

interface LEDState {
  r: number
  g: number
  b: number
}

export default function LEDGenerator() {
  const [numLEDs, setNumLEDs] = useState(20)
  const [pattern, setPattern] = useState('rainbow')
  const [speed, setSpeed] = useState(50)
  const [brightness, setBrightness] = useState(100)
  const [customPrompt, setCustomPrompt] = useState('')
  const [leds, setLeds] = useState<LEDState[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [frame, setFrame] = useState(0)
  const [generatedCode, setGeneratedCode] = useState('')

  useEffect(() => {
    initializeLEDs()
  }, [numLEDs])

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setFrame(f => f + 1)
      }, 100 - speed)
      return () => clearInterval(interval)
    }
  }, [isAnimating, speed])

  useEffect(() => {
    if (isAnimating) {
      updateLEDs()
    }
  }, [frame, pattern, brightness])

  const initializeLEDs = () => {
    const newLeds = Array(numLEDs).fill(null).map(() => ({ r: 0, g: 0, b: 0 }))
    setLeds(newLeds)
  }

  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    }
  }

  const applyBrightness = (color: LEDState) => {
    const factor = brightness / 100
    return {
      r: Math.round(color.r * factor),
      g: Math.round(color.g * factor),
      b: Math.round(color.b * factor)
    }
  }

  const updateLEDs = () => {
    const newLeds = Array(numLEDs).fill(null).map((_, i) => {
      let color: LEDState = { r: 0, g: 0, b: 0 }

      switch (pattern) {
        case 'rainbow':
          const hue = ((i / numLEDs * 360) + frame * 2) % 360
          color = hslToRgb(hue, 100, 50)
          break

        case 'wave':
          const wave = Math.sin((i / numLEDs * Math.PI * 2) + (frame * 0.1)) * 0.5 + 0.5
          color = { r: Math.round(wave * 255), g: Math.round((1 - wave) * 255), b: 128 }
          break

        case 'chase':
          const chasePos = frame % numLEDs
          const distance = Math.abs(i - chasePos)
          const intensity = Math.max(0, 1 - distance / 3)
          color = { r: Math.round(intensity * 255), g: Math.round(intensity * 100), b: Math.round(intensity * 255) }
          break

        case 'strobe':
          const strobeOn = Math.floor(frame / 2) % 2 === 0
          color = strobeOn ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }
          break

        case 'fire':
          const fireIntensity = Math.random() * 0.5 + 0.5
          color = {
            r: Math.round(255 * fireIntensity),
            g: Math.round(100 * fireIntensity),
            b: 0
          }
          break

        case 'police':
          const half = Math.floor(numLEDs / 2)
          const policeFrame = Math.floor(frame / 3) % 2
          if (i < half) {
            color = policeFrame === 0 ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 0 }
          } else {
            color = policeFrame === 1 ? { r: 0, g: 0, b: 255 } : { r: 0, g: 0, b: 0 }
          }
          break

        case 'sparkle':
          color = Math.random() > 0.95 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 20 }
          break

        case 'breathing':
          const breathe = (Math.sin(frame * 0.1) + 1) / 2
          color = { r: Math.round(breathe * 100), g: Math.round(breathe * 150), b: Math.round(breathe * 255) }
          break

        default:
          color = { r: 255, g: 255, b: 255 }
      }

      return applyBrightness(color)
    })

    setLeds(newLeds)
  }

  const generateArduinoCode = () => {
    const code = `#include <FastLED.h>

#define LED_PIN     6
#define NUM_LEDS    ${numLEDs}
#define BRIGHTNESS  ${brightness}
#define LED_TYPE    WS2812B
#define COLOR_ORDER GRB

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
}

void loop() {
  ${pattern}Pattern();
  FastLED.show();
  delay(${100 - speed});
}

void ${pattern}Pattern() {
  static uint8_t frame = 0;
  frame++;

  ${getPatternCode(pattern)}
}

${getHelperFunctions()}
`
    setGeneratedCode(code)
  }

  const getPatternCode = (patternType: string) => {
    switch (patternType) {
      case 'rainbow':
        return `for(int i = 0; i < NUM_LEDS; i++) {
    uint8_t hue = (i * 255 / NUM_LEDS + frame * 2) % 256;
    leds[i] = CHSV(hue, 255, 255);
  }`

      case 'wave':
        return `for(int i = 0; i < NUM_LEDS; i++) {
    uint8_t value = (sin8(i * 255 / NUM_LEDS + frame * 2) / 2) + 127;
    leds[i] = CRGB(value, 255 - value, 128);
  }`

      case 'chase':
        return `int pos = frame % NUM_LEDS;
  fadeToBlackBy(leds, NUM_LEDS, 64);
  leds[pos] = CRGB::Purple;
  if(pos > 0) leds[pos-1] = CRGB::DarkViolet;
  if(pos < NUM_LEDS-1) leds[pos+1] = CRGB::DarkViolet;`

      case 'fire':
        return `for(int i = 0; i < NUM_LEDS; i++) {
    uint8_t heat = random8(180, 255);
    leds[i] = CRGB(heat, heat / 2.5, 0);
  }`

      case 'police':
        return `fill_solid(leds, NUM_LEDS/2, (frame/3) % 2 ? CRGB::Red : CRGB::Black);
  fill_solid(leds + NUM_LEDS/2, NUM_LEDS/2, (frame/3) % 2 ? CRGB::Black : CRGB::Blue);`

      default:
        return `fill_solid(leds, NUM_LEDS, CRGB::White);`
    }
  }

  const getHelperFunctions = () => {
    return `// Helper functions are provided by FastLED library
// sin8(), random8(), fill_solid(), fadeToBlackBy(), etc.`
  }

  const handleGenerate = () => {
    setIsAnimating(true)
    updateLEDs()
    generateArduinoCode()
  }

  const handleStop = () => {
    setIsAnimating(false)
  }

  const handleReset = () => {
    setIsAnimating(false)
    setFrame(0)
    initializeLEDs()
  }

  const handleAIGenerate = () => {
    // Simulate AI pattern generation based on prompt
    if (customPrompt.toLowerCase().includes('ocean')) {
      setPattern('wave')
    } else if (customPrompt.toLowerCase().includes('party')) {
      setPattern('rainbow')
    } else if (customPrompt.toLowerCase().includes('emergency')) {
      setPattern('police')
    } else {
      setPattern('sparkle')
    }
    handleGenerate()
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🎨 LED Generator Agent</h1>
        <p>AI-Powered LED Pattern & Animation Generator</p>
      </header>

      <div className="controls">
        <div className="control-row">
          <div className="control-group">
            <label>Number of LEDs: {numLEDs}</label>
            <input
              type="range"
              min="5"
              max="100"
              value={numLEDs}
              onChange={(e) => setNumLEDs(Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>Speed: {speed}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>Brightness: {brightness}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="control-group">
          <label>Pattern Type</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
            <option value="rainbow">🌈 Rainbow</option>
            <option value="wave">🌊 Wave</option>
            <option value="chase">⚡ Chase</option>
            <option value="strobe">💡 Strobe</option>
            <option value="fire">🔥 Fire</option>
            <option value="police">🚨 Police</option>
            <option value="sparkle">✨ Sparkle</option>
            <option value="breathing">💨 Breathing</option>
          </select>
        </div>

        <div className="control-group">
          <label>AI Pattern Generator (Describe your desired effect)</label>
          <textarea
            placeholder="E.g., 'Create a calm ocean wave effect' or 'Party mode with fast colors'"
            rows={3}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>

        <div className="button-group">
          <button className="btn-primary" onClick={handleGenerate}>
            ▶️ Generate & Play
          </button>
          <button className="btn-secondary" onClick={handleStop}>
            ⏸️ Stop
          </button>
          <button className="btn-secondary" onClick={handleReset}>
            🔄 Reset
          </button>
          {customPrompt && (
            <button className="btn-primary" onClick={handleAIGenerate}>
              🤖 AI Generate
            </button>
          )}
        </div>
      </div>

      <div className="led-grid">
        <h2>LED Preview</h2>
        <div className="led-strip">
          {leds.map((led, i) => (
            <div
              key={i}
              className="led"
              style={{
                backgroundColor: `rgb(${led.r}, ${led.g}, ${led.b})`,
                boxShadow: `0 0 ${brightness / 5}px rgb(${led.r}, ${led.g}, ${led.b})`
              }}
            />
          ))}
        </div>
      </div>

      {generatedCode && (
        <div className="code-output">
          <h2>🔧 Arduino Code (FastLED Library)</h2>
          <pre><code>{generatedCode}</code></pre>
          <button
            className="btn-primary"
            style={{ marginTop: '15px' }}
            onClick={() => navigator.clipboard.writeText(generatedCode)}
          >
            📋 Copy Code
          </button>
        </div>
      )}
    </div>
  )
}
