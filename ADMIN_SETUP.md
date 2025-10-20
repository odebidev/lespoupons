# Configuration du compte Super Admin (PDG)

## Compte configuré dans la base de données

- **Email** : minodevreact@gmail.com
- **Nom** : Super Administrateur PDG
- **Rôle** : PDG (Président Directeur Général)
- **Statut** : Actif

## Créer le compte d'authentification

Pour créer le compte d'authentification pour l'utilisateur PDG, suivez l'une de ces méthodes :

### Méthode 1 : Via l'interface web (Recommandé)

1. Accédez à la page d'initialisation : `http://localhost:5173/init-admin`
2. Le champ email est pré-rempli avec : `minodevreact@gmail.com`
3. Entrez un mot de passe sécurisé (minimum 8 caractères)
4. Cliquez sur "Créer le compte Super Admin"
5. Une fois créé, retournez à la page de connexion principale

### Méthode 2 : Via l'API Edge Function

Utilisez la fonction Edge déployée :

```bash
curl -X POST "https://dazrjnbhngfriwxhdlyy.supabase.co/functions/v1/create-admin-account" \
  -H "Content-Type: application/json" \
  -d '{"email":"minodevreact@gmail.com","password":"VotreMotDePasseSécurisé"}'
```

## Connexion après création

1. Allez sur la page de connexion
2. Entrez l'email : `minodevreact@gmail.com`
3. Entrez le mot de passe que vous avez défini
4. Cliquez sur "Se connecter"

## Permissions du compte PDG

Le compte PDG a accès à **TOUS** les modules du système :

✅ **Tableau de bord** - Vue d'ensemble complète
✅ **Élèves** - Gestion des élèves
✅ **Enseignants** - Gestion des enseignants
✅ **Classes** - Gestion des classes
✅ **Matières** - Gestion des matières
✅ **Écolage** - Gestion des frais de scolarité
✅ **Personnel** - Gestion du personnel administratif
✅ **Paie & IRSA** - Gestion de la paie et impôts
✅ **Trésorerie** - Gestion des transactions financières
✅ **Gestion Utilisateurs** - Création et gestion des utilisateurs

### Droits complets

- ✅ Créer tous les enregistrements
- ✅ Modifier tous les champs
- ✅ Supprimer tous les enregistrements
- ✅ Gérer tous les utilisateurs
- ✅ Accéder à toutes les données

## Sécurité

- Le mot de passe doit contenir au minimum 8 caractères
- Utilisez un mot de passe fort avec des lettres, chiffres et caractères spéciaux
- Ne partagez jamais vos identifiants de connexion
