import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { createGroupRoute, allUsersRoute } from '../utils/APIRoutes';
import { toast } from 'react-toastify';

const CreateGroup = ({ isOpen, onClose, currentUser, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    } else {
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${allUsersRoute}/${currentUser.id}`);
      setAvailableUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Le nom du groupe est requis');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Sélectionnez au moins un membre');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${createGroupRoute}/${currentUser.id}`, {
        name: groupName,
        description: groupDescription,
        memberIds: selectedUsers
      });

      if (data.status) {
        toast.success('Groupe créé avec succès !');
        onGroupCreated(data.group);
        onClose();
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création du groupe');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <Container onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <h2>Créer un groupe</h2>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          <FormGroup>
            <Label>Nom du groupe</Label>
            <Input
              type="text"
              placeholder="Ex: Team Project"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
            />
          </FormGroup>

          <FormGroup>
            <Label>Description (optionnel)</Label>
            <TextArea
              placeholder="Description du groupe..."
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </FormGroup>

          <FormGroup>
            <Label>Ajouter des membres ({selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''})</Label>
            <SearchInput
              type="text"
              placeholder="Rechercher des utilisateurs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <UsersList>
              {filteredUsers.map(user => (
                <UserItem 
                  key={user.id}
                  onClick={() => handleToggleUser(user.id)}
                  className={selectedUsers.includes(user.id) ? 'selected' : ''}
                >
                  <UserAvatar>
                    <img 
                      src={`data:image/svg+xml;base64,${user.avatarImage}`} 
                      alt={user.username}
                    />
                  </UserAvatar>
                  <UserName>{user.username}</UserName>
                  <Checkbox>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {}}
                    />
                  </Checkbox>
                </UserItem>
              ))}
            </UsersList>
          </FormGroup>
        </Content>

        <Footer>
          <CancelButton onClick={onClose}>Annuler</CancelButton>
          <CreateButton 
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedUsers.length === 0}
          >
            {loading ? 'Création...' : 'Créer le groupe'}
          </CreateButton>
        </Footer>
      </Modal>
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

const Modal = styled.div`
  background-color: white;
  border-radius: 1rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;

  h2 {
    margin: 0;
    color: #333;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;

  &:hover {
    color: #333;
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #9a86f3;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #9a86f3;
  }
`;

const SearchInput = styled(Input)`
  margin-bottom: 1rem;
`;

const UsersList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }

  &.selected {
    background-color: #f0e9ff;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }
`;

const UserAvatar = styled.div`
  img {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
  }
`;

const UserName = styled.span`
  flex: 1;
  font-weight: 500;
`;

const Checkbox = styled.div`
  input {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
  }
`;

const Footer = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  background: white;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const CreateButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: #9a86f3;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #8c7ae6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default CreateGroup; 