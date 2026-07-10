const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'fincalcsmart.com',
          },
        ],
        destination: 'https://www.fincalcsmart.com/:path*',
        permanent: true,
      },
    ];
  }
};

export default nextConfig;
