from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('session_management', '0004_recurringschedule'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='last_reschedule_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]