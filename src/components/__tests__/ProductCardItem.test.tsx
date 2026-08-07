"use client";

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductCardItem } from '../ProductCardItem';
import { Product } from '../../data/mockData';

const mockProduct: Product = {
  id: 'prod-123',
  name: 'Test RC Car',
  brandId: 'b1',
  categoryId: 'c1',
  slug: 'test-rc-car',
  description: 'A very fast test car',
  price: 5000,
  comparePrice: 6000,
  sku: 'TEST-SKU',
  weightGrams: 2000,
  scale: '1:10',
  terrainType: 'Off-Road',
  isFeatured: true,
  isActive: true,
  speedKmh: 80,
  buildType: 'RTR',
  images: ['/test-image.jpg'],
  videoUrl: '',
  whatsInTheBox: ['Car', 'Controller'],
  specs: {},
  compatibleParts: [],
  variants: [],
  stockQty: 10,
  averageRating: 4.5,
  reviewCount: 12
};

describe('ProductCardItem', () => {
  it('renders product details correctly', () => {
    const mockToggleWishlist = vi.fn();
    const mockOnProductClick = vi.fn();

    render(
      <ProductCardItem
        p={mockProduct}
        wishlist={[]}
        toggleWishlist={mockToggleWishlist}
        onProductClick={mockOnProductClick}
      />
    );

    expect(screen.getByText('Test RC Car')).toBeInTheDocument();
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText('₹6,000')).toBeInTheDocument();
  });

  it('calls toggleWishlist when heart icon is clicked', () => {
    const mockToggleWishlist = vi.fn();
    const mockOnProductClick = vi.fn();

    const { container } = render(
      <ProductCardItem
        p={mockProduct}
        wishlist={[]}
        toggleWishlist={mockToggleWishlist}
        onProductClick={mockOnProductClick}
      />
    );

    // Wishlist button is the first button in the component
    const wishlistButton = container.querySelectorAll('button')[0];
    fireEvent.click(wishlistButton);

    expect(mockToggleWishlist).toHaveBeenCalledTimes(1);
    expect(mockToggleWishlist).toHaveBeenCalledWith('prod-123');
  });

  it('calls onProductClick when card is clicked', () => {
    const mockToggleWishlist = vi.fn();
    const mockOnProductClick = vi.fn();

    const { container } = render(
      <ProductCardItem
        p={mockProduct}
        wishlist={[]}
        toggleWishlist={mockToggleWishlist}
        onProductClick={mockOnProductClick}
      />
    );

    // The root div has the onClick
    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(mockOnProductClick).toHaveBeenCalledTimes(1);
    expect(mockOnProductClick).toHaveBeenCalledWith(mockProduct);
  });
});
