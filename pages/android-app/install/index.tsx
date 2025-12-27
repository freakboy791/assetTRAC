/**
 * Public Android App Installation Page - SIMPLE TEST VERSION
 * No authentication required - accessible to anyone via URL or QR code
 * Route: /android-app/install
 */
export default function AndroidAppInstallPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#4F46E5', fontSize: '32px', marginBottom: '20px' }}>
        ✅ Test Page Working!
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
        If you can see this, the routing is working correctly.
      </p>
      <div style={{ backgroundColor: '#F3F4F6', padding: '20px', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#1F2937', marginBottom: '15px' }}>Android App Installation</h2>
        <p style={{ color: '#4B5563', marginBottom: '20px' }}>
          This is a test page to verify routing works. The full installation page will be restored once routing is confirmed.
        </p>
        <button 
          onClick={() => alert('Download button clicked!')}
          style={{
            backgroundColor: '#4F46E5',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Test Download Button
        </button>
      </div>
      <p style={{ marginTop: '30px', color: '#9CA3AF', fontSize: '14px' }}>
        Route: /android-app/install
      </p>
    </div>
  )
}
