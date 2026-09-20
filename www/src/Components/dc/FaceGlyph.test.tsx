import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FaceGlyph from './FaceGlyph';

const draw = (shape: 'cross' | 'circle' | 'square' | 'triangle') =>
  render(
    <svg>
      <FaceGlyph shape={shape} cx={50} cy={50} size={9} color="#123456" />
    </svg>,
  ).container.querySelector('[data-shape]') as SVGElement;

describe('FaceGlyph', () => {
  it.each(['cross', 'circle', 'square', 'triangle'] as const)(
    'draws a %s outline in the given color',
    (shape) => {
      const el = draw(shape);
      expect(el).toHaveAttribute('data-shape', shape);
      expect(el.querySelector('[stroke="#123456"]')).not.toBeNull();
      expect(el.querySelector('[fill="#123456"]')).toBeNull(); // outline only
    },
  );

  it('draws distinct primitives per shape', () => {
    expect(draw('circle').querySelector('circle')).not.toBeNull();
    expect(draw('square').querySelector('rect')).not.toBeNull();
    expect(draw('triangle').querySelector('polygon')).not.toBeNull();
    expect(draw('cross').querySelectorAll('line').length).toBe(2);
  });
});
