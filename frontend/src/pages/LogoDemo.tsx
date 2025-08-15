import React from 'react';
import GoDepthLogo from '../components/GoDepthLogo';

const LogoDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Go Depth Logo Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Featuring the friendly Go gopher mascot with modern design
          </p>
        </div>

        {/* Logo Variants */}
        <div className="space-y-16">
          
          {/* Default Variant */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Default Variant
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Small</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="sm" showText={true} animated={true} variant="default" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Medium</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="md" showText={true} animated={true} variant="default" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Large</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={true} animated={true} variant="default" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Extra Large</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="xl" showText={true} animated={true} variant="default" />
                </div>
              </div>
            </div>
          </section>

          {/* Minimal Variant */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Minimal Variant
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Small</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="sm" showText={true} animated={true} variant="minimal" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Medium</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="md" showText={true} animated={true} variant="minimal" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Large</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={true} animated={true} variant="minimal" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Extra Large</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="xl" showText={true} animated={true} variant="minimal" />
                </div>
              </div>
            </div>
          </section>

          {/* Full Variant */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Full Variant (Hover for Animation)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Small</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="sm" showText={true} animated={true} variant="full" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Medium</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="md" showText={true} animated={true} variant="full" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Large</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={true} animated={true} variant="full" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Extra Large</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="xl" showText={true} animated={true} variant="full" />
                </div>
              </div>
            </div>
          </section>

          {/* Logo Only (No Text) */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Logo Only (No Text)
            </h2>
            <div className="flex justify-center space-x-12">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Default</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={false} animated={true} variant="default" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Minimal</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={false} animated={true} variant="minimal" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Full</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={false} animated={true} variant="full" />
                </div>
              </div>
            </div>
          </section>

          {/* Dark Background Example */}
          <section className="bg-gray-900 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-white mb-6">
              On Dark Background
            </h2>
            <div className="flex justify-center space-x-12">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Default</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={true} animated={true} variant="default" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Full</h3>
                <div className="flex justify-center">
                  <GoDepthLogo size="lg" showText={true} animated={true} variant="full" />
                </div>
              </div>
            </div>
          </section>

          {/* Usage Instructions */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Usage Instructions
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h3>Props</h3>
              <ul>
                <li><strong>size:</strong> 'sm' | 'md' | 'lg' | 'xl' - Controls the logo size</li>
                <li><strong>showText:</strong> boolean - Show or hide the "Go Depth" text</li>
                <li><strong>animated:</strong> boolean - Enable hover animations and effects</li>
                <li><strong>variant:</strong> 'default' | 'minimal' | 'full' - Different visual styles</li>
                <li><strong>className:</strong> string - Additional CSS classes</li>
              </ul>
              
              <h3>Design Features</h3>
              <ul>
                <li><strong>Go Gopher:</strong> Friendly mascot with professional styling</li>
                <li><strong>Go Brand Colors:</strong> Cyan/teal blue color scheme</li>
                <li><strong>Responsive:</strong> Scales beautifully across all screen sizes</li>
                <li><strong>Animations:</strong> Subtle hover effects for interactivity</li>
                <li><strong>Code Elements:</strong> Programming symbols on the gopher's body</li>
                <li><strong>Gradient Text:</strong> Modern gradient text treatment</li>
              </ul>

              <h3>Code Example</h3>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
{`import GoDepthLogo from './components/GoDepthLogo';

// Basic usage
<GoDepthLogo />

// Custom configuration
<GoDepthLogo 
  size="lg" 
  variant="full" 
  animated={true} 
  showText={true} 
/>`}
              </pre>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default LogoDemo;