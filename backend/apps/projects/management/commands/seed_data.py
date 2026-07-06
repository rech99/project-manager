from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.projects.models import Organization, Project, ProjectMember
from apps.boards.models import Board, Column
from apps.sprints.models import Sprint
from apps.tasks.models import Task, TaskHistory, Comment
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with realistic Scrum and Kanban projects, tasks, comments, and history.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        
        # Clear data in order of foreign key dependencies
        Comment.objects.all().delete()
        TaskHistory.objects.all().delete()
        Task.objects.all().delete()
        Sprint.objects.all().delete()
        Column.objects.all().delete()
        Board.objects.all().delete()
        ProjectMember.objects.all().delete()
        Project.objects.all().delete()
        Organization.objects.all().delete()
        
        # Keep only superusers, delete other mock users
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write(self.style.SUCCESS('Data cleared. Seeding database...'))

        try:
            with transaction.atomic():
                self.seed_users_and_organizations()
                self.seed_scrum_project()
                self.seed_kanban_project()
                
            self.stdout.write(self.style.SUCCESS('Successfully seeded database with realistic portfolio data!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Seeding failed: {str(e)}'))
            raise e

    def seed_users_and_organizations(self):
        # 1. Create Mock Users
        self.users = {
            'alex_pm': User.objects.create_user(
                username='alex_pm', email='alex.pm@aerospace.io', password='password123',
                first_name='Alex', last_name='Vance', bio='Senior Technical Project Manager with 8+ years experience in Scrum methodologies.'
            ),
            'sarah_dev': User.objects.create_user(
                username='sarah_dev', email='sarah.dev@aerospace.io', password='password123',
                first_name='Sarah', last_name='Connor', bio='Senior Full-stack Engineer. Specializes in Django, React, and Real-time WebSocket architectures.'
            ),
            'john_qa': User.objects.create_user(
                username='john_qa', email='john.qa@aerospace.io', password='password123',
                first_name='John', last_name='Miller', bio='QA & Automation Specialist. Passionate about Cypress, Pytest, and stress testing.'
            ),
            'elon_viewer': User.objects.create_user(
                username='elon_viewer', email='elon.viewer@aerospace.io', password='password123',
                first_name='Elon', last_name='Stark', bio='Executive Stakeholder & Product Visionary.'
            ),
            'mark_lead': User.objects.create_user(
                username='mark_lead', email='mark.lead@marketinghub.com', password='password123',
                first_name='Mark', last_name='Ruffalo', bio='Product Marketing Director and Kanban advocate.'
            ),
            'lucy_designer': User.objects.create_user(
                username='lucy_designer', email='lucy.designer@marketinghub.com', password='password123',
                first_name='Lucy', last_name='Liu', bio='UI/UX Designer. Focused on high-fidelity designs, style guides, and design systems.'
            ),
            'clara_copywriter': User.objects.create_user(
                username='clara_copywriter', email='clara.copy@marketinghub.com', password='password123',
                first_name='Clara', last_name='Oswald', bio='Creative Content Writer & SEO Specialist.'
            ),
        }

        # 2. Create Organizations
        self.orgs = {
            'aerospace': Organization.objects.create(name='AeroSpace Tech Industries'),
            'marketing': Organization.objects.create(name='Marketing Hub Inc.'),
        }

    def seed_scrum_project(self):
        # 1. Project
        project = Project.objects.create(
            organization=self.orgs['aerospace'],
            name='Falcon Rocket Control Dashboard',
            key='FALC',
            description='Web-based real-time control interface for monitoring telemetry, engine parameters, and payload stats during flight.',
            project_type='SCRUM'
        )

        # 2. Project Members & Roles
        ProjectMember.objects.create(project=project, user=self.users['alex_pm'], role='ADMIN')
        ProjectMember.objects.create(project=project, user=self.users['sarah_dev'], role='MEMBER')
        ProjectMember.objects.create(project=project, user=self.users['john_qa'], role='MEMBER')
        ProjectMember.objects.create(project=project, user=self.users['elon_viewer'], role='VIEWER')

        # 3. Boards
        board = Board.objects.create(
            project=project,
            name='Falcon Development Board',
            description='Active Scrum board for the Rocket Telemetry team.'
        )

        # 4. Columns (Ranked with Lexorank)
        c_backlog = Column.objects.create(board=board, name='Backlog', rank_order='a')
        c_todo = Column.objects.create(board=board, name='To Do', rank_order='b')
        c_progress = Column.objects.create(board=board, name='In Progress', rank_order='c')
        Column.objects.create(board=board, name='Code Review', rank_order='d')
        c_done = Column.objects.create(board=board, name='Done', rank_order='e')

        # 5. Sprints
        # Sprint 1 (Completed 2 weeks ago)
        sprint1 = Sprint.objects.create(
            project=project,
            name='Sprint 1: Core Authentication & Layout',
            goal='Establish basic frontend skeleton, user authentication, and secure API structure.',
            status='COMPLETED',
            start_date=timezone.now() - timedelta(days=21),
            end_date=timezone.now() - timedelta(days=7)
        )

        # Sprint 2 (Active, started 7 days ago, ends in 7 days)
        sprint2 = Sprint.objects.create(
            project=project,
            name='Sprint 2: Real-time Telemetry',
            goal='Implement WebSocket connections, render charts for telemetry flow, and add stress testing.',
            status='ACTIVE',
            start_date=timezone.now() - timedelta(days=7),
            end_date=timezone.now() + timedelta(days=7)
        )

        # Sprint 3 (Planning, future)
        sprint3 = Sprint.objects.create(
            project=project,
            name='Sprint 3: Engine Shutdown Analytics & Exports',
            goal='Add downloadable telemetry reports, PDF export, and advanced engine failure alert heuristics.',
            status='PLANNING',
            start_date=timezone.now() + timedelta(days=8),
            end_date=timezone.now() + timedelta(days=22)
        )

        # 6. Tasks (with customized, realistic history logs to feed the Burn-down)
        # --- SPRINT 1 TASKS (ALL DONE) ---
        t1 = Task.objects.create(
            project=project, board=board, column=c_done, sprint=sprint1,
            key='FALC-1', title='Implement JWT Authentication & User Sessions',
            description='Setup simple-jwt backend authentication endpoints and login/registration routes. Create auth context on React frontend.',
            task_type='STORY', priority='HIGH', story_points=5, rank_order='n1',
            assignee=self.users['sarah_dev'], reporter=self.users['alex_pm']
        )
        # History for FALC-1 (simulating movement over sprint 1)
        t1.created_at = timezone.now() - timedelta(days=20)
        t1.save()
        TaskHistory.objects.create(task=t1, user=self.users['alex_pm'], field_changed='column', old_value='Backlog', new_value='To Do', created_at=timezone.now() - timedelta(days=20))
        TaskHistory.objects.create(task=t1, user=self.users['sarah_dev'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=19))
        TaskHistory.objects.create(task=t1, user=self.users['sarah_dev'], field_changed='column', old_value='In Progress', new_value='Code Review', created_at=timezone.now() - timedelta(days=17))
        TaskHistory.objects.create(task=t1, user=self.users['john_qa'], field_changed='column', old_value='Code Review', new_value='Done', created_at=timezone.now() - timedelta(days=16))
        Comment.objects.create(task=t1, user=self.users['john_qa'], content='Passed automation tests and JWT token refreshes correctly. Nice job!')

        t2 = Task.objects.create(
            project=project, board=board, column=c_done, sprint=sprint1,
            key='FALC-5', title='Design dashboard landing layout with dark theme support',
            description='Create visual mockup of dashboard grid (gridmorphism). Implement theme toggler in React store.',
            task_type='STORY', priority='MEDIUM', story_points=5, rank_order='n2',
            assignee=self.users['sarah_dev'], reporter=self.users['alex_pm']
        )
        t2.created_at = timezone.now() - timedelta(days=20)
        t2.save()
        TaskHistory.objects.create(task=t2, user=self.users['alex_pm'], field_changed='column', old_value='Backlog', new_value='To Do', created_at=timezone.now() - timedelta(days=20))
        TaskHistory.objects.create(task=t2, user=self.users['sarah_dev'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=18))
        TaskHistory.objects.create(task=t2, user=self.users['sarah_dev'], field_changed='column', old_value='In Progress', new_value='Done', created_at=timezone.now() - timedelta(days=15))

        # --- SPRINT 2 TASKS (ACTIVE SPRINT) ---
        t3 = Task.objects.create(
            project=project, board=board, column=c_progress, sprint=sprint2,
            key='FALC-2', title='Integrate real-time engine telemetry WebSocket connection',
            description='Connect backend Django Channels telemetry group to React dashboard. Stream mock telemetry (speed, fuel, temperature) at 5Hz.',
            task_type='STORY', priority='CRITICAL', story_points=8, rank_order='n3',
            assignee=self.users['sarah_dev'], reporter=self.users['alex_pm']
        )
        t3.created_at = timezone.now() - timedelta(days=7)
        t3.save()
        TaskHistory.objects.create(task=t3, user=self.users['alex_pm'], field_changed='column', old_value='Backlog', new_value='To Do', created_at=timezone.now() - timedelta(days=6))
        TaskHistory.objects.create(task=t3, user=self.users['sarah_dev'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=5))
        Comment.objects.create(task=t3, user=self.users['alex_pm'], content='Remember to throttle the update rate to 100ms on the frontend so the browser doesn\'t freeze.')
        Comment.objects.create(task=t3, user=self.users['sarah_dev'], content='Yes, I\'m throttling updates using a custom requestAnimationFrame loop.')

        # Subtasks of FALC-2
        Task.objects.create(
            project=project, board=board, column=c_progress, sprint=sprint2, parent=t3,
            key='FALC-7', title='Optimize Recharts rendering performance for high-frequency updates',
            description='Use React memoization and canvas rendering instead of SVG if telemetry stream is too intense.',
            task_type='SUBTASK', priority='HIGH', rank_order='n3a',
            assignee=self.users['sarah_dev'], reporter=self.users['sarah_dev']
        )
        sub2 = Task.objects.create(
            project=project, board=board, column=c_done, sprint=sprint2, parent=t3,
            key='FALC-8', title='Create Django background telemetry mock generator',
            description='Create a Celery task that streams telemetry data into the channel layer when a flight is active.',
            task_type='SUBTASK', priority='MEDIUM', rank_order='n3b',
            assignee=self.users['sarah_dev'], reporter=self.users['sarah_dev']
        )
        TaskHistory.objects.create(task=sub2, user=self.users['sarah_dev'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=4))
        TaskHistory.objects.create(task=sub2, user=self.users['sarah_dev'], field_changed='column', old_value='In Progress', new_value='Done', created_at=timezone.now() - timedelta(days=2))

        t4 = Task.objects.create(
            project=project, board=board, column=c_todo, sprint=sprint2,
            key='FALC-3', title='Fix telemetry chart flickering on data update',
            description='The chart component rerenders completely when a new WebSocket frame arrives. We need to preserve the data array reference.',
            task_type='BUG', priority='HIGH', story_points=3, rank_order='n4',
            assignee=self.users['john_qa'], reporter=self.users['john_qa']
        )
        t4.created_at = timezone.now() - timedelta(days=5)
        t4.save()
        TaskHistory.objects.create(task=t4, user=self.users['john_qa'], field_changed='column', old_value='Backlog', new_value='To Do', created_at=timezone.now() - timedelta(days=5))

        t5 = Task.objects.create(
            project=project, board=board, column=c_done, sprint=sprint2,
            key='FALC-4', title='Add unit tests for WebSocket message parser',
            description='Ensure the parser correctly validates fields and throws exceptions on invalid inputs.',
            task_type='TASK', priority='MEDIUM', story_points=2, rank_order='n5',
            assignee=self.users['john_qa'], reporter=self.users['sarah_dev']
        )
        t5.created_at = timezone.now() - timedelta(days=6)
        t5.save()
        TaskHistory.objects.create(task=t5, user=self.users['john_qa'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=5))
        TaskHistory.objects.create(task=t5, user=self.users['john_qa'], field_changed='column', old_value='In Progress', new_value='Code Review', created_at=timezone.now() - timedelta(days=3))
        TaskHistory.objects.create(task=t5, user=self.users['john_qa'], field_changed='column', old_value='Code Review', new_value='Done', created_at=timezone.now() - timedelta(days=2))

        # --- SPRINT 3 TASKS (BACKLOG/PLANNING) ---
        Task.objects.create(
            project=project, board=board, column=c_backlog, sprint=sprint3,
            key='FALC-6', title='Write API documentation for telemetry endpoints',
            description='Document URL endpoints, WebSocket connection schemas, response fields, and error codes in Swagger/OpenAPI.',
            task_type='TASK', priority='LOW', story_points=1, rank_order='n6',
            assignee=None, reporter=self.users['alex_pm']
        )

        Task.objects.create(
            project=project, board=board, column=c_backlog,
            key='FALC-9', title='Research WebGL for 3D trajectory rendering',
            description='Look into Three.js or BabylonJS to render a live 3D visual track of the rocket trajectory inside a canvas card.',
            task_type='STORY', priority='MEDIUM', story_points=8, rank_order='n7',
            assignee=None, reporter=self.users['elon_viewer']
        )

    def seed_kanban_project(self):
        # 1. Project
        project = Project.objects.create(
            organization=self.orgs['marketing'],
            name='Marketing Hub Brand Redesign',
            key='MARK',
            description='Continuous flow marketing campaign and redesign. Track visual styling, typography guidelines, and landing updates.',
            project_type='KANBAN'
        )

        # 2. Project Members & Roles
        ProjectMember.objects.create(project=project, user=self.users['mark_lead'], role='ADMIN')
        ProjectMember.objects.create(project=project, user=self.users['lucy_designer'], role='MEMBER')
        ProjectMember.objects.create(project=project, user=self.users['clara_copywriter'], role='MEMBER')

        # 3. Boards
        board = Board.objects.create(
            project=project,
            name='Redesign Strategy Board',
            description='Continuous kanban flow with WIP limits.'
        )

        # 4. Columns (with WIP Limits)
        Column.objects.create(board=board, name='Backlog', rank_order='a')
        c_todo = Column.objects.create(board=board, name='To Do', rank_order='b')
        c_progress = Column.objects.create(board=board, name='In Progress', wip_limit=3, rank_order='c')
        c_done = Column.objects.create(board=board, name='Done', rank_order='d')

        # 5. Tasks
        t1 = Task.objects.create(
            project=project, board=board, column=c_done,
            key='MARK-1', title='Create brand style guide and typography guidelines',
            description='Draft color palettes (HSL), spacing standards, typography sheets, and logo usage guidelines for the new identity.',
            task_type='STORY', priority='HIGH', rank_order='k1',
            assignee=self.users['lucy_designer'], reporter=self.users['mark_lead']
        )
        t1.created_at = timezone.now() - timedelta(days=12)
        t1.save()
        TaskHistory.objects.create(task=t1, user=self.users['mark_lead'], field_changed='column', old_value='Backlog', new_value='To Do', created_at=timezone.now() - timedelta(days=11))
        TaskHistory.objects.create(task=t1, user=self.users['lucy_designer'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=10))
        TaskHistory.objects.create(task=t1, user=self.users['lucy_designer'], field_changed='column', old_value='In Progress', new_value='Done', created_at=timezone.now() - timedelta(days=7))

        t2 = Task.objects.create(
            project=project, board=board, column=c_progress,
            key='MARK-2', title='Design home page landing layout high-fidelity prototype',
            description='Create Figma interactive mockups of the redesigned home page. Focus on hero widgets and responsive layout frames.',
            task_type='STORY', priority='HIGH', rank_order='k2',
            assignee=self.users['lucy_designer'], reporter=self.users['mark_lead']
        )
        t2.created_at = timezone.now() - timedelta(days=6)
        t2.save()
        TaskHistory.objects.create(task=t2, user=self.users['lucy_designer'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=5))
        Comment.objects.create(task=t2, user=self.users['lucy_designer'], content='I have posted the Figma link. Please review the hero section spacing.')
        Comment.objects.create(task=t2, user=self.users['mark_lead'], content='Typography in the hero looks superb. I would just reduce the padding on mobile layouts.')

        t3 = Task.objects.create(
            project=project, board=board, column=c_progress,
            key='MARK-3', title='Write copy for landing page hero section',
            description='Write 3 alternatives for the main hero heading and subtext. Ensure SEO terms are present.',
            task_type='TASK', priority='MEDIUM', rank_order='k3',
            assignee=self.users['clara_copywriter'], reporter=self.users['mark_lead']
        )
        t3.created_at = timezone.now() - timedelta(days=5)
        t3.save()
        TaskHistory.objects.create(task=t3, user=self.users['clara_copywriter'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=4))

        t4 = Task.objects.create(
            project=project, board=board, column=c_todo,
            key='MARK-4', title='A/B test sign up button color options (green vs blue)',
            description='Verify which button color converts better using Optimizely script triggers.',
            task_type='TASK', priority='LOW', rank_order='k4',
            assignee=self.users['clara_copywriter'], reporter=self.users['mark_lead']
        )
        t4.created_at = timezone.now() - timedelta(days=4)
        t4.save()

        t5 = Task.objects.create(
            project=project, board=board, column=c_done,
            key='MARK-5', title='Setup SEO meta tags and Google Analytics tags',
            description='Implement static meta description, OpenGraph preview tags, and inject the GTM script container.',
            task_type='TASK', priority='MEDIUM', rank_order='k5',
            assignee=self.users['clara_copywriter'], reporter=self.users['mark_lead']
        )
        t5.created_at = timezone.now() - timedelta(days=10)
        t5.save()
        TaskHistory.objects.create(task=t5, user=self.users['clara_copywriter'], field_changed='column', old_value='To Do', new_value='In Progress', created_at=timezone.now() - timedelta(days=9))
        TaskHistory.objects.create(task=t5, user=self.users['clara_copywriter'], field_changed='column', old_value='In Progress', new_value='Done', created_at=timezone.now() - timedelta(days=8))
