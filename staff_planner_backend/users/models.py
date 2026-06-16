import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class Branch(models.Model):
    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('teacher', 'Teacher'),
        ('parent', 'Parent'),
        ('admin', 'Admin'),
        ('manager', 'Manager'),
    ]
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=150)
    email    = models.EmailField(unique=True, null=True, blank=True)
    phone    = models.CharField(max_length=20, blank=True)
    roles    = models.JSONField(default=list)
    # Primary branch (for non-managers / backward compat)
    branch   = models.ForeignKey(Branch, null=True, blank=True, on_delete=models.SET_NULL, related_name='primary_users')
    # Managers can manage multiple branches
    managed_branches = models.ManyToManyField(Branch, blank=True, related_name='managers')
    role_id  = models.UUIDField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff  = models.BooleanField(default=False)

    objects = UserManager()
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self): return self.email

    @property
    def branch_ids(self):
        """Return list of branch IDs this manager manages."""
        if 'manager' in (self.roles or []):
            ids = list(self.managed_branches.values_list('id', flat=True))
            if self.branch_id and self.branch_id not in ids:
                ids.append(self.branch_id)
            return [str(i) for i in ids]
        return [str(self.branch_id)] if self.branch_id else []


class Child(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name             = models.CharField(max_length=150)
    parent_user      = models.ForeignKey(User, related_name='children', on_delete=models.CASCADE)
    branch           = models.ForeignKey(Branch, null=True, blank=True, on_delete=models.SET_NULL)
    assigned_teacher = models.ForeignKey(User, related_name='assigned_children', null=True, blank=True, on_delete=models.SET_NULL)