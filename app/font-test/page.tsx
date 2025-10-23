'use client';

export default function FontTestPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-foreground mb-8">
          Font Test Page
        </h1>
        
        {/* Lacquer Font Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
            Lacquer Font Examples
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Using .font-lacquer class:
              </h3>
              <h1 className="font-lacquer text-4xl text-foreground">
                $SBTC - The Legendary Token
              </h1>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Using .title-lacquer class:
              </h3>
              <h2 className="title-lacquer text-3xl text-foreground">
                Interplanetary Guardian
              </h2>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Different sizes with Lacquer:
              </h3>
              <div className="space-y-2">
                <p className="font-lacquer text-5xl text-foreground">Large Title</p>
                <p className="font-lacquer text-3xl text-foreground">Medium Title</p>
                <p className="font-lacquer text-xl text-foreground">Small Title</p>
                <p className="font-lacquer text-base text-foreground">Regular Text</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Comparison with other fonts */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
            Font Comparison
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-muted-foreground mb-2">Lacquer Font</h3>
              <p className="font-lacquer text-2xl text-foreground">
                $SBTC Token
              </p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-muted-foreground mb-2">Chakra Petch Font</h3>
              <p className="title text-2xl text-foreground">
                $SBTC Token
              </p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-muted-foreground mb-2">Default Font</h3>
              <p className="text-2xl text-foreground">
                $SBTC Token
              </p>
            </div>
          </div>
        </div>
        
        {/* Usage Instructions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
            How to Use Lacquer Font
          </h2>
          
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="font-semibold text-foreground mb-3">CSS Classes Available:</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <code className="bg-background px-2 py-1 rounded text-foreground">
                  .font-lacquer
                </code>
                - Applies Lacquer font family with default weight
              </li>
              <li>
                <code className="bg-background px-2 py-1 rounded text-foreground">
                  .title-lacquer
                </code>
                - Applies Lacquer font with optimized styling for titles (includes letter-spacing)
              </li>
            </ul>
            
            <h3 className="font-semibold text-foreground mb-3 mt-6">Example Usage:</h3>
            <pre className="bg-background p-4 rounded text-sm text-foreground overflow-x-auto">
{`<h1 className="font-lacquer text-4xl">Title</h1>
<h2 className="title-lacquer text-2xl">Subtitle</h2>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}