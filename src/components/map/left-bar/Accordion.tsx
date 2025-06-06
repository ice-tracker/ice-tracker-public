import React, { useState, useRef } from 'react';

// Define the props for AccordionItem
interface AccordionItemProps {
  title: React.ReactNode;
  content: React.ReactNode; // Can be string, JSX, etc.
  isOpen: boolean;
  onClick: () => void;
  id: string; // For ARIA attributes
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, content, isOpen, onClick, id }) => {
  const contentId = `content-${id}`;
  const buttonId = `button-${id}`;

  return (
    <div className="border-b border-gray-200">
      <button
        id={buttonId}
        className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">{title}</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ease-in-out ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        id={contentId}
        aria-labelledby={buttonId}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-screen' : 'max-h-0' // Use a sufficiently large max-h
        }`}
      >
        {/* Conditionally render content wrapper to avoid measuring hidden content for transition */}
        {isOpen && (
          <div className="p-4 bg-white text-gray-600">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};

// Define the structure of each item in the 'items' array
interface ItemType {
  id?: string; // Optional ID from data, will be generated if not present
  title: React.ReactNode; // Title can be a string or JSX
  content: React.ReactNode;
}

// Define the props for the main Accordion component
interface AccordionProps {
  items: ItemType[];
}

const Accordion: React.FC<AccordionProps> = ({ items }) => {
  // All closed by default
  const [open, setOpen] = React.useState<boolean[]>(
    items.map(() => false)
  );
  const contentRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const handleClick = (index: number): void => {
    setOpen((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  return (
    <div style={{ width: '100%' }}>
      {items.map((item, idx) => (
        <React.Fragment key={item.id || idx}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              justifyContent: 'space-between',
              padding: '2px 0',
              fontWeight: 'bold',
              fontSize: '1.2em',
              color: '#2F549D',
            }}
            onClick={() => handleClick(idx)}
          >
            <span>{item.title}</span>
            <span style={{ marginLeft: 'auto', marginRight: 0, paddingLeft: '12px' }}>
              {open[idx] ? '-' : '+'}
            </span>
          </div>
          <div
            ref={el => { contentRefs.current[idx] = el; }}
            style={{
              maxHeight: open[idx]
                ? contentRefs.current[idx]?.scrollHeight
                  ? contentRefs.current[idx]!.scrollHeight + 'px'
                  : '500px'
                : '0px',
              overflow: 'hidden',
              transition: 'max-height 0.15s cubic-bezier(0.4,0,0.2,1)',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginTop: open[idx] ? '3px' : 0,
              pointerEvents: open[idx] ? 'auto' : 'none',
            }}
            aria-hidden={!open[idx]}
          >
            {item.content}
          </div>
          {idx < items.length - 1 && (
            <hr
              style={{
                border: 0,
                borderTop: '1px solid #d3d3d3',
                margin: '6px 0',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Accordion;

// Example Usage (how you might define your items with types):
const myItems: ItemType[] = [
  {
    id: 'q1',
    title: 'What is React?',
    content: 'A JavaScript library for building user interfaces.',
  },
  {
    id: 'q2',
    title: 'What is Tailwind CSS?',
    content: 'A utility-first CSS framework.',
  },
  {
    id: 'q3',
    title: 'How do they work together?',
    content: ( // Content can also be JSX
      <>
        <p>Beautifully, for creating dynamic and styled UIs.</p>
        <p>You can embed components, lists, and more!</p>
        <ul>
          <li>Like this</li>
          <li>And this</li>
        </ul>
      </>
    ),
  },
  { // Item without a pre-defined id
    title: 'What about IDs?',
    content: 'If an `id` is not provided in the `items` prop, one will be generated based on the index.'
  }
];

// To use it in another component:
// import Accordion from './Accordion'; // Adjust path as needed
//
// const App: React.FC = () => {
//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">My Awesome Accordion</h1>
//       <Accordion items={myItems} />
//     </div>
//   );
// }