'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()

  const features = [
    {
      icon: '🎯',
      title: 'AI-Powered Assessment',
      description: 'Advanced AI evaluation using Gemini for accurate IELTS scoring'
    },
    {
      icon: '📊',
      title: 'Comprehensive Analysis',
      description: 'Detailed insights into your strengths and areas for improvement'
    },
    {
      icon: '⚡',
      title: 'Instant Results',
      description: 'Get your scores and feedback immediately after completion'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your test data is processed securely and kept confidential'
    }
  ]

  const steps = [
    { num: 1, text: 'Select Level' },
    { num: 2, text: 'Choose Section' },
    { num: 3, text: 'Take Test' },
    { num: 4, text: 'View Results' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="container-custom py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-2xl mb-6">
            <span className="text-4xl">📝</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            IELTS Test Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Comprehensive AI-powered assessment for all four IELTS skills. 
            Get detailed feedback and actionable insights to improve your English proficiency.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/level-selection')}
            className="btn-primary text-lg px-8 py-4"
          >
            Start Your Test
          </motion.button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -4 }}
              className="card text-center"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Process Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="card max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="section-header">How It Works</h2>
            <p className="section-subtitle">Simple 4-step process to get your IELTS assessment</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {steps.map((step, index) => (
              <div key={step.num} className="flex flex-col items-center flex-1">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg mb-4">
                    {step.num}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -z-10" style={{ width: 'calc(100% - 4rem)' }}>
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-8 border-l-gray-200 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700 text-center">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Assess Your English Level?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Take our comprehensive IELTS test and receive detailed feedback on your listening, 
            reading, writing, and speaking skills.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/level-selection')}
            className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Now
          </motion.button>
        </div>
      </section>
    </div>
  )
}
