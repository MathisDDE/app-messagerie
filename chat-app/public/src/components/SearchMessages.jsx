import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { searchMessagesRoute } from '../utils/APIRoutes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SearchMessages = ({ isOpen, onClose, currentUser, currentChat, onSelectMessage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = {
        query: searchQuery
      };

      if (currentChat) {
        params.contactId = currentChat.id;
      }

      const { data } = await axios.get(`${searchMessagesRoute}/${currentUser.id}`, {
        params
      });

      if (data.status) {
        setSearchResults(data.messages);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleSelectMessage(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelectMessage = (message) => {
    onSelectMessage(message);
    onClose();
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="highlight">{part}</mark> 
        : part
    );
  };

  const formatDate = (date) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Container onClick={onClose}>
      <SearchModal onClick={(e) => e.stopPropagation()}>
        <SearchHeader>
          <h3>Rechercher dans les messages</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </SearchHeader>

        <SearchInputWrapper>
          <SearchIcon>🔍</SearchIcon>
          <SearchInput
            ref={searchInputRef}
            type="text"
            placeholder={currentChat ? `Rechercher dans la conversation avec ${currentChat.username}...` : "Rechercher dans toutes les conversations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <LoadingSpinner>⏳</LoadingSpinner>}
        </SearchInputWrapper>

        {searchResults.length > 0 && (
          <ResultsContainer>
            <ResultsHeader>{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}</ResultsHeader>
            {searchResults.map((message, index) => (
              <ResultItem
                key={message.id}
                onClick={() => handleSelectMessage(message)}
                className={index === selectedIndex ? 'selected' : ''}
              >
                <ResultAvatar>
                  <img 
                    src={`data:image/svg+xml;base64,${message.conversationWith.avatarImage}`} 
                    alt={message.conversationWith.username}
                  />
                </ResultAvatar>
                <ResultContent>
                  <ResultHeader>
                    <span className="username">{message.conversationWith.username}</span>
                    <span className="date">{formatDate(message.createdAt)}</span>
                  </ResultHeader>
                  <ResultMessage>
                    {message.fromSelf && <span className="sender">Vous: </span>}
                    {highlightText(message.content, searchQuery)}
                  </ResultMessage>
                </ResultContent>
              </ResultItem>
            ))}
          </ResultsContainer>
        )}

        {searchQuery.length >= 2 && !loading && searchResults.length === 0 && (
          <NoResults>Aucun message trouvé</NoResults>
        )}

        {searchQuery.length < 2 && searchQuery.length > 0 && (
          <Hint>Tapez au moins 2 caractères pour rechercher</Hint>
        )}
      </SearchModal>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const SearchModal = styled.div`
  background-color: var(--bg-color, white);
  border-radius: 1rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const SearchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0;
    color: var(--text-color);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 2rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
  background-color: var(--input-bg, #f5f5f5);
  color: var(--text-color);

  &:focus {
    outline: none;
    border-color: #9a86f3;
  }
`;

const LoadingSpinner = styled.span`
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: translateY(-50%) rotate(0deg); }
    to { transform: translateY(-50%) rotate(360deg); }
  }
`;

const ResultsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const ResultsHeader = styled.div`
  padding: 0.5rem 1rem;
  color: #666;
  font-size: 0.9rem;
`;

const ResultItem = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover, &.selected {
    background-color: rgba(154, 134, 243, 0.1);
  }
`;

const ResultAvatar = styled.div`
  img {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
  }
`;

const ResultContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;

  .username {
    font-weight: 600;
    color: var(--text-color);
  }

  .date {
    font-size: 0.8rem;
    color: #666;
  }
`;

const ResultMessage = styled.div`
  color: #666;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .sender {
    font-weight: 500;
    color: var(--text-color);
  }

  .highlight {
    background-color: #ffeb3b;
    color: #000;
    padding: 0 2px;
    border-radius: 2px;
  }
`;

const NoResults = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const Hint = styled.div`
  text-align: center;
  padding: 2rem;
  color: #999;
  font-size: 0.9rem;
`;

export default SearchMessages; 