from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, Watchlist


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ['id', 'username', 'email', 'cpf', 'balance', 'is_staff']
    search_fields = ['username', 'email', 'cpf']

    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Dados pessoais', {
            'fields': (
                'cpf',
                'cellphone',
                'address',
                'town',
                'post_code',
                'country',
                'birth_date',
                'balance',
            ),
        }),
    )

    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ('Dados pessoais', {
            'classes': ('wide',),
            'fields': (
                'username',
                'email',
                'cpf',
                'cellphone',
                'address',
                'town',
                'post_code',
                'country',
                'birth_date',
                'password1',
                'password2',
            ),
        }),
    )


admin.site.register(Watchlist)
