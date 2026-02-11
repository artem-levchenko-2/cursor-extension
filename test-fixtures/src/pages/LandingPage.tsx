import React from 'react';
import Feature17 from '../blocks/Feature17';
import Feature50 from '../blocks/Feature50';
import Hero03 from '../blocks/Hero03';

/**
 * Sample landing page that imports multiple block components.
 * Use this file to test the code-hover trigger:
 *   - Place cursor on Feature17, Feature50, or Hero03
 *   - The preview panel should update automatically.
 */
export default function LandingPage() {
  return (
    <main>
      <Hero03 />
      <Feature17 />
      <Feature50 />
    </main>
  );
}
